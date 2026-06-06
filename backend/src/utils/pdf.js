const PDFDocument = require('pdfkit');

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
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

  doc.pipe(res);
  build(doc);
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

function sectionTitle(doc, title) {
  doc.moveDown(0.8);
  const currentY = doc.y;
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(title, 40, currentY);
  doc.moveDown(0.2);
  // Elegant line separator
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9);
}

function drawMetadataGrid(doc, items) {
  const startY = doc.y;
  let currentY = startY;
  
  items.forEach((item, index) => {
    // Clean 2-column key-value layout
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col === 0 ? 40 : 300;
    const y = startY + row * 16;
    
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569').text(`${item.label}:`, x, y, { width: 95, continued: true });
    doc.font('Helvetica').fillColor('#1e293b').text(` ${formatValue(item.value)}`, { width: 145 });
    
    currentY = y + 16;
  });
  
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

  rows.forEach((row) => {
    // If table runs to page end, insert page break and repeat headers
    if (doc.y > 720) {
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
    let maxHeight = 0;
    
    columns.forEach((column, index) => {
      doc.text(formatValue(column.value(row)), colPositions[index] + 4, startY + 4, {
        width: column.width - 8,
        align: column.align || 'left'
      });
      const height = doc.y - startY;
      if (height > maxHeight) {
        maxHeight = height;
      }
      doc.y = startY;
    });
    
    doc.y = startY + maxHeight + 8;

    // Draw horizontal row separator
    doc.moveTo(40, doc.y - 2).lineTo(555, doc.y - 2).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
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
      { label: 'Item', width: 165, value: (row) => `${row.item_name} ${row.variant_name || ''}`.trim() },
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
          { label: 'Item Type / Description', width: 380, value: (row) => `${row.item_name} ${row.variant_name || ''}`.trim() },
          { label: 'Qty', width: 135, align: 'right', value: (row) => row.quantity }
        );
      } else {
        columns.push(
          { label: 'Item', width: 185, value: (row) => `${row.item_name} ${row.variant_name || ''}`.trim() },
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

module.exports = {
  sendCustomerReceiptPdf,
  sendDispatchCustomerReceiptsPdf,
  sendDispatchSummaryPdf,
  sendPdf
};
