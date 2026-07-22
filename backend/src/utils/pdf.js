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

function sendPdf(res, filename, build) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

  doc.pipe(res);
  build(doc);

  // Global Footer Pass
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    
    // Draw footer line
    doc.moveTo(40, 800).lineTo(555, 800).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    
    // Draw footer text
    doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8');
    doc.text('Kivaro Charcoal ERP', 40, 808, { align: 'left' });
    doc.text(`Page ${i + 1} of ${range.count}`, 40, 808, { align: 'right', width: 515 });
  }

  doc.end();
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

function customerLines(dispatch, customerId) {
  return (dispatch.items || []).filter((item) => Number(item.dispatch_customer_id) === Number(customerId));
}

function sendDispatchCustomerChecklistPdf(res, dispatch, company = {}) {
  return sendPdf(res, `dispatch-${dispatch.dispatch_number || dispatch.id}-customer-checklist.pdf`, (doc) => {
    drawCompanyHeader(doc, company, 'Customer Checklist', `Dispatch ${dispatch.dispatch_number || dispatch.id}`);
    (dispatch.customers || []).forEach((customer, index) => {
      if (index > 0) {
        doc.addPage();
        drawCompanyHeader(doc, company, 'Customer Checklist', `Dispatch ${dispatch.dispatch_number || dispatch.id}`);
      }
      sectionTitle(doc, customer.customer_name);
      drawMetadataGrid(doc, [
        { label: 'Customer', value: customer.customer_name },
        { label: 'Territory', value: customer.sublocation_name || customer.location_name },
        { label: 'Invoice', value: customer.invoice_number || '-' },
        { label: 'Phone', value: customer.customer_phone || '-' }
      ]);
      drawRows(doc, customerLines(dispatch, customer.id), [
        { label: 'Item', width: 225, value: (row) => row.item_name_snapshot || row.catalog_display_name || '-' },
        { label: 'Type', width: 85, value: (row) => row.line_type === 'free_gift' ? 'Gift' : 'Sale' },
        { label: 'Qty', width: 65, align: 'right', value: (row) => row.quantity },
        { label: 'Unit', width: 65, value: (row) => row.unit_label_snapshot },
        { label: 'Check', width: 75, value: () => '________' }
      ]);
    });
  });
}

function sendDispatchQuantityPdf(res, dispatch, company = {}) {
  return sendPdf(res, `dispatch-${dispatch.dispatch_number || dispatch.id}-quantities.pdf`, (doc) => {
    drawCompanyHeader(doc, company, 'Quantity-only Dispatch Table', `Dispatch ${dispatch.dispatch_number || dispatch.id}`);
    sectionTitle(doc, 'Delivery Quantities');
    drawRows(doc, dispatch.items || [], [
      { label: 'Customer', width: 120, value: (row) => (dispatch.customers || []).find((customer) => Number(customer.id) === Number(row.dispatch_customer_id))?.customer_name || '-' },
      { label: 'Item', width: 220, value: (row) => row.item_name_snapshot || row.catalog_display_name || '-' },
      { label: 'Gift', width: 55, value: (row) => row.line_type === 'free_gift' ? 'Yes' : 'No' },
      { label: 'Qty', width: 60, align: 'right', value: (row) => row.quantity },
      { label: 'Unit', width: 60, value: (row) => row.unit_label_snapshot }
    ]);
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

module.exports = {
  sendCustomerReceiptPdf,
  sendDispatchCustomerChecklistPdf,
  sendDispatchCustomerReceiptsPdf,
  sendDispatchQuantityPdf,
  sendDispatchSummaryPdf,
  sendInvoicePdf,
  sendPdf
};
