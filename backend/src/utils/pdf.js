const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value);
}

function formatMoney(value) {
  const number = Number(value || 0);
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function renderPdf(build) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    build(doc);

  // Global Footer Pass
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    
    // Draw footer line
    doc.moveTo(40, 780).lineTo(555, 780).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    
    // Draw footer text
    doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8');
    doc.text('Kivaro Charcoal ERP', 40, 788, { align: 'left' });
    doc.text(`Page ${i + 1} of ${range.count}`, 40, 788, { align: 'right', width: 515 });
  }

    doc.end();
  });
}

async function sendPdf(res, filename, build) {
  const pdf = await renderPdf(build);
  if (res.destroyed || res.writableEnded) {
    throw new Error('PDF response is no longer writable');
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Content-Length', pdf.length);
  if (typeof res.once !== 'function') {
    res.end(pdf);
    return pdf;
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(pdf);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error('PDF response failed'));
    };
    res.once('finish', finish);
    res.once('error', fail);
    res.once('close', () => {
      if (!res.writableFinished) fail(new Error('PDF response closed before completion'));
    });
    res.end(pdf);
  });
}

function drawHeaderBlock(doc, title, subtitle) {
  // Accent bar at the top of the A4 page (x=40, y=30, width=515)
  doc.rect(40, 30, 515, 3).fill('#0ea5e9');
  
  doc.y = 45;
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e293b').text(title, 40, doc.y);
  doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text(subtitle);
  doc.moveDown(0.5);
}

function companyLogoPath(company = {}) {
  const logoUrl = String(company.logo_url || '');
  if (!logoUrl) return null;
  const uploadsMatch = logoUrl.match(/\/uploads\/([^/?#]+)$/);
  if (!uploadsMatch) return null;
  const localPath = path.join(__dirname, '../../public/uploads', path.basename(uploadsMatch[1]));
  return fs.existsSync(localPath) ? localPath : null;
}

function drawCompanyHeader(doc, company = {}, title, subtitle) {
  const logoPath = companyLogoPath(company);
  if (logoPath) {
    try {
      doc.image(logoPath, 40, 36, { fit: [76, 42] });
    } catch {
      // A malformed uploaded image must not prevent the required document from downloading.
    }
  } else {
    doc.rect(40, 36, 76, 42).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('LOGO', 40, 52, { width: 76, align: 'center' });
  }
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f172a')
    .text(company.company_name || 'Company', 128, 38, { width: 280 });
  doc.font('Helvetica').fontSize(8).fillColor('#475569')
    .text(company.address || '', 128, 57, { width: 280 })
    .text(company.phone || company.email || '', 128, 68, { width: 280 });
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155')
    .text(`VAT / Tax No.: ${company.tax_number || '-'}`, 410, 40, { width: 145, align: 'right' });
  doc.rect(40, 90, 515, 2).fill('#0ea5e9');
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e293b').text(title, 40, 105);
  doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text(subtitle || '', 40, 125);
  doc.y = 143;
}

function sectionTitle(doc, title) {
  doc.moveDown(0.8);
  const currentY = doc.y;
  // Draw left border bar (3pt wide, 12pt high)
  doc.rect(40, currentY, 3, 12).fill('#0ea5e9');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(title, 48, currentY, { width: 507 });
  doc.moveDown(0.2);
  // Elegant line separator
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9);
}

function drawMetadataGrid(doc, items) {
  const startY = doc.y;
  let currentY = startY;
  
  for (let i = 0; i < items.length; i += 2) {
    const item1 = items[i];
    const item2 = items[i + 1];
    
    const x1 = 40;
    const x2 = 300;
    const colWidth = 245;
    
    let h1 = 0;
    let h2 = 0;
    
    if (item1) {
      const val1 = formatValue(item1.value);
      const text1 = `${item1.label}: ${val1}`;
      h1 = doc.heightOfString(text1, { width: colWidth });
    }
    
    if (item2) {
      const val2 = formatValue(item2.value);
      const text2 = `${item2.label}: ${val2}`;
      h2 = doc.heightOfString(text2, { width: colWidth });
    }
    
    const rowHeight = Math.max(h1, h2, 16);
    
    if (item1) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569')
         .text(`${item1.label}: `, x1, currentY, { width: colWidth, continued: true })
         .font('Helvetica').fillColor('#1e293b')
         .text(formatValue(item1.value));
    }
    
    if (item2) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569')
         .text(`${item2.label}: `, x2, currentY, { width: colWidth, continued: true })
         .font('Helvetica').fillColor('#1e293b')
         .text(formatValue(item2.value));
    }
    
    currentY += rowHeight + 4;
  }
  
  doc.y = currentY + 10;
}

function drawRows(doc, rows, columns) {
  if (!rows.length) {
    doc.font('Helvetica-Oblique').fillColor('#64748b').text('No records.', 40, doc.y);
    doc.y += 10;
    return;
  }

  // Calculate cumulative X positions for each column to eliminate overlaps
  let currentX = 40;
  const colPositions = columns.map(col => {
    const pos = currentX;
    currentX += col.width;
    return pos;
  });

  const headerY = doc.y;
  
  // Draw header block background
  doc.rect(40, headerY - 4, 515, 20).fill('#f8fafc');
  
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155');
  columns.forEach((column, index) => {
    doc.text(column.label, colPositions[index] + 4, headerY, {
      width: column.width - 8,
      align: column.align || 'left'
    });
  });
  
  doc.y = headerY + 20;

  // Thin clean border under table header
  doc.moveTo(40, doc.y - 2).lineTo(555, doc.y - 2).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

  doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b');

  rows.forEach((row, rowIndex) => {
    // Determine the row height first by checking all columns
    let maxHeight = 0;
    columns.forEach((column) => {
      const text = formatValue(column.value(row));
      const height = doc.heightOfString(text, { width: column.width - 8 });
      if (height > maxHeight) {
        maxHeight = height;
      }
    });

    // Check for page break
    if (doc.y + maxHeight + 12 > 750) {
      doc.addPage();
      
      const headerYNew = doc.y;
      doc.rect(40, headerYNew - 4, 515, 20).fill('#f8fafc');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155');
      columns.forEach((column, index) => {
        doc.text(column.label, colPositions[index] + 4, headerYNew, {
          width: column.width - 8,
          align: column.align || 'left'
        });
      });
      doc.y = headerYNew + 20;
      doc.moveTo(40, doc.y - 2).lineTo(555, doc.y - 2).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b');
    }

    const startY = doc.y;

    // Draw alternating background
    if (rowIndex % 2 === 1) {
      doc.rect(40, startY, 515, maxHeight + 8).fill('#f8fafc');
    }

    // Draw columns
    doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b');
    columns.forEach((column, index) => {
      doc.text(formatValue(column.value(row)), colPositions[index] + 4, startY + 4, {
        width: column.width - 8,
        align: column.align || 'left'
      });
    });
    
    doc.y = startY + maxHeight + 8;

    // Draw horizontal row separator
    doc.moveTo(40, doc.y - 2).lineTo(555, doc.y - 2).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  });
  
  doc.y += 10;
}

function sendDispatchSummaryPdf(res, dispatch) {
  return sendPdf(res, `dispatch-${dispatch.dispatch_number || dispatch.id}-summary.pdf`, (doc) => {
    drawHeaderBlock(doc, 'Dispatch Summary', `Generated at ${new Date().toISOString()}`);

    sectionTitle(doc, 'Dispatch Details');
    drawMetadataGrid(doc, [
      { label: 'Dispatch number', value: dispatch.dispatch_number },
      { label: 'Status', value: dispatch.status },
      { label: 'Salesman', value: dispatch.salesman_name || dispatch.salesman_id },
      { label: 'Warehouse', value: dispatch.warehouse_name || dispatch.warehouse_id },
      { label: 'Request date', value: dispatch.request_date },
      { label: 'Total quantity', value: dispatch.total_quantity },
      { label: 'Subtotal', value: `$${formatMoney(dispatch.subtotal_amount || dispatch.total_amount)}` },
      { label: 'VAT', value: `$${formatMoney(dispatch.vat_amount)}` },
      { label: 'Total amount', value: `$${formatMoney(dispatch.total_amount)}` },
      { label: 'Collected', value: `$${formatMoney(dispatch.total_collected)}` },
      { label: 'Debt', value: `$${formatMoney(dispatch.total_debt)}` }
    ]);

    sectionTitle(doc, 'Customers on Route');
    drawRows(doc, dispatch.customers || [], [
      { label: 'Customer', width: 150, value: (row) => row.customer_name },
      { label: 'Receipt', width: 130, value: (row) => row.receipt_number },
      { label: 'Subtotal', width: 60, align: 'right', value: (row) => formatMoney(row.subtotal_amount || row.customer_total_amount) },
      { label: 'VAT', width: 50, align: 'right', value: (row) => formatMoney(row.vat_amount) },
      { label: 'Total', width: 65, align: 'right', value: (row) => formatMoney(row.customer_total_amount) },
      { label: 'Debt', width: 60, align: 'right', value: (row) => formatMoney(row.debt_amount) }
    ]);

    sectionTitle(doc, 'Dispatched Items');
    drawRows(doc, dispatch.items || [], [
      { label: 'Item', width: 165, value: (row) => row.item_name || row.description },
      { label: 'SKU', width: 100, value: (row) => row.sku },
      { label: 'Qty', width: 55, align: 'right', value: (row) => row.quantity },
      { label: 'Price', width: 65, align: 'right', value: (row) => formatMoney(row.unit_price) },
      { label: 'VAT', width: 55, align: 'right', value: (row) => formatMoney(row.vat_amount) },
      { label: 'Total', width: 75, align: 'right', value: (row) => formatMoney(row.line_total) }
    ]);
  });
}

function sendDispatchCustomerReceiptsPdf(res, dispatch, options = {}) {
  const noPrice = options.noPrice === true || options.noPrice === 'true';
  const filename = noPrice
    ? `dispatch-${dispatch.dispatch_number || dispatch.id}-delivery-notes.pdf`
    : `dispatch-${dispatch.dispatch_number || dispatch.id}-customer-receipts.pdf`;
  const title = noPrice ? 'Customer Delivery Notes' : 'Customer Receipts';
  const subtitle = noPrice ? 'Quantity & Product Type only (no pricing)' : `Dispatch ${dispatch.dispatch_number || dispatch.id}`;

  return sendPdf(res, filename, (doc) => {
    drawHeaderBlock(doc, title, subtitle);

    (dispatch.customers || []).forEach((customer, index) => {
      if (index > 0) {
        doc.addPage();
        drawHeaderBlock(doc, title, subtitle);
      }

      sectionTitle(doc, noPrice ? 'Delivery Note' : 'Receipt Details');
      
      const metadata = [
        { label: 'Customer', value: customer.customer_name },
        { label: 'Location', value: customer.sublocation_name || customer.location_name },
        { label: 'Dispatch number', value: dispatch.dispatch_number }
      ];

      if (!noPrice) {
        metadata.unshift({ label: 'Receipt number', value: customer.receipt_number });
        metadata.push(
          { label: 'Status', value: customer.payment_status },
          { label: 'Subtotal', value: `$${formatMoney(customer.subtotal_amount || customer.customer_total_amount)}` },
          { label: 'VAT', value: `$${formatMoney(customer.vat_amount)}` },
          { label: 'Total', value: `$${formatMoney(customer.customer_total_amount)}` },
          { label: 'Collected', value: `$${formatMoney(customer.collected_amount)}` },
          { label: 'Remaining', value: `$${formatMoney(customer.debt_amount)}` }
        );
      } else {
        const refNumber = customer.receipt_number 
          ? `DEL-${customer.receipt_number.split('-').slice(1).join('-')}` 
          : `DEL-${customer.id}`;
        metadata.unshift({ label: 'Delivery Ref', value: refNumber });
        metadata.push({ label: 'Status', value: 'delivering' });
      }

      drawMetadataGrid(doc, metadata);

      const items = (dispatch.items || []).filter(
        (item) => Number(item.dispatch_customer_id) === Number(customer.id)
      );

      sectionTitle(doc, 'Delivered Items');

      const columns = [];
      if (noPrice) {
        columns.push(
          { label: 'Item Type / Description', width: 380, value: (row) => row.item_name || row.description },
          { label: 'Qty', width: 135, align: 'right', value: (row) => row.quantity }
        );
      } else {
        columns.push(
          { label: 'Item', width: 185, value: (row) => row.item_name || row.description },
          { label: 'Qty', width: 60, align: 'right', value: (row) => row.quantity },
          { label: 'Price', width: 90, align: 'right', value: (row) => formatMoney(row.unit_price) },
          { label: 'VAT', width: 90, align: 'right', value: (row) => formatMoney(row.vat_amount) },
          { label: 'Total', width: 90, align: 'right', value: (row) => formatMoney(row.line_total) }
        );
      }

      drawRows(doc, items, columns);
    });

    if (!dispatch.customers || dispatch.customers.length === 0) {
      sectionTitle(doc, 'Receipts');
      doc.font('Helvetica-Oblique').fillColor('#64748b').text('No customers are attached to this dispatch.');
    }
  });
}

function sendCustomerReceiptPdf(res, receipt) {
  return sendPdf(res, `receipt-${receipt.receipt_number || receipt.id}.pdf`, (doc) => {
    drawHeaderBlock(doc, 'Customer Receipt', `Generated at ${new Date().toISOString()}`);

    sectionTitle(doc, 'Receipt Details');
    drawMetadataGrid(doc, [
      { label: 'Receipt number', value: receipt.receipt_number },
      { label: 'Customer', value: receipt.customer_name || receipt.customer_id },
      { label: 'Receipt date', value: receipt.receipt_date },
      { label: 'Receipt type', value: receipt.receipt_type },
      { label: 'Subtotal', value: `$${formatMoney(receipt.subtotal_amount || receipt.total_amount)}` },
      { label: 'VAT', value: `$${formatMoney(receipt.vat_amount)}` },
      { label: 'Total amount', value: `$${formatMoney(receipt.total_amount)}` },
      { label: 'Paid amount', value: `$${formatMoney(receipt.paid_amount)}` },
      { label: 'Remaining amount', value: `$${formatMoney(receipt.remaining_amount)}` },
      { label: 'Printed at', value: receipt.printed_at }
    ]);
  });
}

function sendCustomerDebtPdf(res, debt) {
  return sendPdf(res, `customer-debt-${debt.debt_number || debt.id}.pdf`, (doc) => {
    drawHeaderBlock(doc, 'Customer Debt Statement', `Debt ${debt.debt_number || debt.id}`);
    drawMetadataGrid(doc, [
      { label: 'Customer', value: debt.customer_name || debt.customer_id },
      { label: 'Debt date', value: debt.debt_date },
      { label: 'Dispatch', value: debt.dispatch_number || debt.dispatch_request_id || '-' },
      { label: 'Status', value: debt.status },
      { label: 'Original amount', value: `$${formatMoney(debt.original_amount)}` },
      { label: 'Paid amount', value: `$${formatMoney(debt.paid_amount)}` },
      { label: 'Remaining amount', value: `$${formatMoney(debt.remaining_amount)}` },
      { label: 'Due date', value: debt.due_date || '-' }
    ]);
  });
}

function sendCustomerPaymentPdf(res, payment) {
  return sendPdf(res, `customer-payment-${payment.payment_number || payment.id}.pdf`, (doc) => {
    drawHeaderBlock(doc, 'Customer Payment Receipt', `Payment ${payment.payment_number || payment.id}`);
    drawMetadataGrid(doc, [
      { label: 'Customer', value: payment.customer_name || payment.customer_id },
      { label: 'Payment date', value: payment.payment_date },
      { label: 'Amount', value: `$${formatMoney(payment.amount)}` },
      { label: 'Method', value: payment.payment_method || '-' },
      { label: 'Reference', value: payment.reference_number || '-' },
      { label: 'Collected by', value: payment.collected_by_salesman_name || '-' }
    ]);
  });
}

function customerLines(dispatch, customerId) {
  return (dispatch.items || []).filter((item) => Number(item.dispatch_customer_id) === Number(customerId));
}

function totalForLines(lines, field) {
  return lines.reduce((total, line) => total + Number(line[field] || 0), 0);
}

function aggregateDispatchQuantities(dispatch) {
  const grouped = new Map();
  for (const line of dispatch.items || []) {
    const name = line.item_name_snapshot || line.catalog_display_name || '-';
    const unit = line.unit_label_snapshot || 'unit';
    const type = line.line_type === 'free_gift' ? 'Gift' : 'Sale';
    const key = [line.sale_catalog_entry_id || name, name, unit, type].join('|');
    const current = grouped.get(key) || { item_name: name, unit, type, quantity: 0 };
    current.quantity += Number(line.quantity || 0);
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((left, right) => (
    left.item_name.localeCompare(right.item_name) || left.unit.localeCompare(right.unit) || left.type.localeCompare(right.type)
  ));
}

function sendDispatchCustomerChecklistPdf(res, dispatch, company = {}) {
  return sendPdf(res, `dispatch-${dispatch.dispatch_number || dispatch.id}-customers-quantities.pdf`, (doc) => {
    drawCompanyHeader(doc, company, 'Customer & Quantity List', `Dispatch ${dispatch.dispatch_number || dispatch.id}`);
    sectionTitle(doc, 'Customer Delivery Summary');
    drawRows(doc, (dispatch.customers || []).map((customer) => {
      const lines = customerLines(dispatch, customer.id);
      return {
        customer_name: customer.customer_name || `Customer #${customer.customer_id}`,
        item_count: lines.length,
        quantity: totalForLines(lines, 'quantity'),
        total: totalForLines(lines, 'line_total')
      };
    }), [
      { label: 'Customer', width: 230, value: (row) => row.customer_name },
      { label: 'Lines', width: 70, align: 'right', value: (row) => row.item_count },
      { label: 'Total Qty', width: 90, align: 'right', value: (row) => row.quantity },
      { label: 'Order Total', width: 125, align: 'right', value: (row) => `$${formatMoney(row.total)}` }
    ]);
    (dispatch.customers || []).forEach((customer, index) => {
      if (index > 0) {
        doc.addPage();
        drawCompanyHeader(doc, company, 'Customer & Quantity List', `Dispatch ${dispatch.dispatch_number || dispatch.id}`);
      }
      sectionTitle(doc, customer.customer_name);
      drawMetadataGrid(doc, [
        { label: 'Customer', value: customer.customer_name },
        { label: 'Territory', value: customer.sublocation_name || customer.location_name },
        { label: 'Invoice', value: customer.invoice_number || '-' },
        { label: 'Phone', value: customer.customer_phone || '-' }
      ]);
      const lines = customerLines(dispatch, customer.id);
      drawRows(doc, lines, [
        { label: 'Item', width: 225, value: (row) => row.item_name_snapshot || row.catalog_display_name || '-' },
        { label: 'Type', width: 85, value: (row) => row.line_type === 'free_gift' ? 'Gift' : 'Sale' },
        { label: 'Qty', width: 65, align: 'right', value: (row) => row.quantity },
        { label: 'Unit', width: 65, value: (row) => row.unit_label_snapshot },
        { label: 'Check', width: 75, value: () => '________' }
      ]);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155')
        .text(`Customer order total: $${formatMoney(totalForLines(lines, 'line_total'))}`, { align: 'right' });
    });
  });
}

function sendDispatchQuantityPdf(res, dispatch, company = {}) {
  return sendPdf(res, `dispatch-${dispatch.dispatch_number || dispatch.id}-quantities.pdf`, (doc) => {
    drawCompanyHeader(doc, company, 'Quantity-only Dispatch Table', `Dispatch ${dispatch.dispatch_number || dispatch.id}`);
    sectionTitle(doc, 'Delivery Quantities');
    const rows = aggregateDispatchQuantities(dispatch);
    drawRows(doc, rows, [
      { label: 'Item / Offer', width: 275, value: (row) => row.item_name },
      { label: 'Type', width: 75, value: (row) => row.type },
      { label: 'Total Qty', width: 95, align: 'right', value: (row) => row.quantity },
      { label: 'Unit', width: 70, value: (row) => row.unit }
    ]);
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155')
      .text(`Total lines: ${(dispatch.items || []).length}   |   Total quantity: ${totalForLines(rows, 'quantity')}`, { align: 'right' });
  });
}

function sendInvoicePdf(res, invoice, lines = [], company = {}) {
  return sendPdf(res, `invoice-${invoice.invoice_number || invoice.id}.pdf`, (doc) => {
    drawCompanyHeader(doc, company, 'Tax Invoice', `Invoice ${invoice.invoice_number || invoice.id}`);
    sectionTitle(doc, 'Invoice Details');
    drawMetadataGrid(doc, [
      { label: 'Invoice number', value: invoice.invoice_number },
      { label: 'Invoice date', value: invoice.invoice_date },
      { label: 'Customer', value: invoice.customer_name },
      { label: 'Dispatch', value: invoice.dispatch_number },
      { label: 'Customer phone', value: invoice.customer_phone },
      { label: 'Customer address', value: invoice.customer_address }
    ]);
    sectionTitle(doc, 'Lines');
    drawRows(doc, lines, [
      { label: 'Description', width: 175, value: (row) => row.description },
      { label: 'Type', width: 48, value: (row) => row.line_type === 'free_gift' ? 'Gift' : 'Sale' },
      { label: 'Qty', width: 47, align: 'right', value: (row) => row.quantity },
      { label: 'Price', width: 65, align: 'right', value: (row) => formatMoney(row.unit_price) },
      { label: 'VAT', width: 55, align: 'right', value: (row) => formatMoney(row.vat_amount) },
      { label: 'Total', width: 75, align: 'right', value: (row) => formatMoney(row.line_total) }
    ]);
    sectionTitle(doc, 'Totals');
    drawMetadataGrid(doc, [
      { label: 'Subtotal', value: `$${formatMoney(invoice.subtotal_amount)}` },
      { label: 'VAT', value: `$${formatMoney(invoice.vat_amount)}` },
      { label: 'Total', value: `$${formatMoney(invoice.total_amount)}` },
      { label: 'Status', value: invoice.status }
    ]);
  });
}

function sendReturnCreditNotePdf(res, creditNote, company = {}) {
  return sendPdf(res, `return-credit-note-${creditNote.credit_note_number || creditNote.id}.pdf`, (doc) => {
    drawCompanyHeader(doc, company, 'Return Credit Note', `Credit Note ${creditNote.credit_note_number || creditNote.id}`);
    sectionTitle(doc, 'Credit Note Details');
    drawMetadataGrid(doc, [
      { label: 'Credit note number', value: creditNote.credit_note_number },
      { label: 'Credit note date', value: creditNote.credit_note_date },
      { label: 'Customer', value: creditNote.customer_name },
      { label: 'Dispatch', value: creditNote.dispatch_number },
      { label: 'Invoice', value: creditNote.invoice_number || '-' },
      { label: 'Reason', value: creditNote.reason || '-' }
    ]);
    sectionTitle(doc, 'Returned Line');
    drawRows(doc, [creditNote], [
      { label: 'Description', width: 245, value: (row) => row.item_name_snapshot || '-' },
      { label: 'Quantity', width: 85, align: 'right', value: (row) => row.returned_quantity },
      { label: 'Unit', width: 80, value: (row) => row.unit_label_snapshot || 'unit' },
      { label: 'Credit', width: 105, align: 'right', value: (row) => `$${formatMoney(row.total_amount)}` }
    ]);
    sectionTitle(doc, 'Credit Total');
    drawMetadataGrid(doc, [
      { label: 'Subtotal credit', value: `$${formatMoney(creditNote.subtotal_amount)}` },
      { label: 'VAT credit', value: `$${formatMoney(creditNote.vat_amount)}` },
      { label: 'Total credit', value: `$${formatMoney(creditNote.total_amount)}` }
    ]);
  });
}

function drawDispatchCustomerOrderInformation(doc, dispatch, customer) {
  sectionTitle(doc, 'Customer & Order Information');
  const fields = [
    { label: 'Customer', value: customer.customer_name || `Customer #${customer.customer_id}` },
    { label: 'Territory', value: [customer.location_name, customer.sublocation_name].filter(Boolean).join(' · ') || '-' },
    { label: 'Delivery Date', value: dispatch.dispatched_at || dispatch.delivery_date || dispatch.request_date || '-' },
    { label: 'Dispatch #', value: dispatch.dispatch_number || `#${dispatch.id}` },
    { label: 'Salesman', value: dispatch.salesman_name || '-' },
    { label: 'Warehouse', value: dispatch.warehouse_name || '-' }
  ];
  const columnWidth = 245;
  let y = doc.y;
  for (let index = 0; index < fields.length; index += 2) {
    const left = fields[index];
    const right = fields[index + 1];
    doc.font('Helvetica').fontSize(8.5);
    const height = Math.max(
      doc.heightOfString(`${left.label}: ${formatValue(left.value)}`, { width: columnWidth }),
      right ? doc.heightOfString(`${right.label}: ${formatValue(right.value)}`, { width: columnWidth }) : 0,
      16
    );
    doc.fillColor('#1e293b').text(`${left.label}: ${formatValue(left.value)}`, 40, y, { width: columnWidth });
    if (right) {
      doc.text(`${right.label}: ${formatValue(right.value)}`, 300, y, { width: columnWidth });
    }
    y += height + 4;
  }
  doc.y = y + 10;
}

function drawDispatchCustomerReceiptPage(doc, dispatch, customer, lines, company) {
    drawCompanyHeader(doc, company, 'Delivery Receipt', `Dispatch ${dispatch.dispatch_number || dispatch.id}`);
    drawDispatchCustomerOrderInformation(doc, dispatch, customer);
    sectionTitle(doc, 'Delivered Items');
    drawRows(doc, lines, [
      { label: 'Description', width: 210, value: (row) => row.item_name_snapshot || row.catalog_display_name || '-' },
      { label: 'Type', width: 65, value: (row) => row.line_type === 'free_gift' ? 'Gift' : 'Sale' },
      { label: 'Qty', width: 65, align: 'right', value: (row) => row.quantity },
      { label: 'Unit', width: 65, value: (row) => row.unit_label_snapshot || 'unit' },
      { label: 'Line Total', width: 95, align: 'right', value: (row) => row.line_type === 'free_gift' ? '$0.00' : `$${formatMoney(row.line_total)}` }
    ]);
}

function drawDispatchCustomerConsentPage(doc, dispatch, customer, company) {
    drawCompanyHeader(doc, company, 'Acceptance & Consent', `Dispatch ${dispatch.dispatch_number || dispatch.id}`);
    drawDispatchCustomerOrderInformation(doc, dispatch, customer);
    sectionTitle(doc, 'Acceptance & Consent Confirmation');
    doc.moveDown(0.5);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#334155');
    doc.text(
      'I, the undersigned customer / authorized representative, hereby confirm that I have received and inspected the delivered goods listed above in full and in good condition. I agree to the quantities, pricing, and terms specified.',
      48,
      doc.y,
      { width: 500 }
    );
    doc.moveDown(2);
    const ySig = doc.y;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569');
    doc.text('Customer Signature: _______________________', 48, ySig);
    doc.text('Date: ________________', 340, ySig);
}

function sendDispatchCustomerReceiptPdf(res, dispatch, customer, lines = [], company = {}) {
  return sendPdf(res, `delivery-receipt-${customer.id}.pdf`, (doc) => {
    drawDispatchCustomerReceiptPage(doc, dispatch, customer, lines, company);
  });
}

function sendDispatchCustomerAcceptanceConsentPdf(res, dispatch, customer, company = {}) {
  return sendPdf(res, `acceptance-consent-${customer.id}.pdf`, (doc) => {
    drawDispatchCustomerConsentPage(doc, dispatch, customer, company);
  });
}

function sendDispatchCustomerDeliveryDocumentPdf(res, dispatch, customer, lines = [], company = {}) {
  return sendPdf(res, `delivery-document-${customer.id}.pdf`, (doc) => {
    drawDispatchCustomerReceiptPage(doc, dispatch, customer, lines, company);
    // The consent is deliberately a second page even when the receipt is short.
    doc.addPage();
    drawDispatchCustomerConsentPage(doc, dispatch, customer, company);
  });
}

module.exports = {
  sendCustomerReceiptPdf,
  sendCustomerDebtPdf,
  sendCustomerPaymentPdf,
  sendDispatchCustomerChecklistPdf,
  sendDispatchCustomerReceiptsPdf,
  sendDispatchCustomerReceiptPdf,
  sendDispatchCustomerAcceptanceConsentPdf,
  sendDispatchCustomerDeliveryDocumentPdf,
  sendDispatchQuantityPdf,
  sendDispatchSummaryPdf,
  sendInvoicePdf,
  sendReturnCreditNotePdf,
  sendPdf,
  renderPdf
};
