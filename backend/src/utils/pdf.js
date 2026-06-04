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

function sectionTitle(doc, title) {
  doc.moveDown(0.8);
  doc.fontSize(13).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10);
}

function keyValue(doc, label, value) {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(formatValue(value));
}

function drawRows(doc, rows, columns) {
  if (!rows.length) {
    doc.text('No records.');
    return;
  }

  doc.font('Helvetica-Bold');
  columns.forEach((column, index) => {
    doc.text(column.label, 40 + index * column.width, doc.y, {
      width: column.width,
      continued: index < columns.length - 1
    });
  });
  doc.text('');
  doc.font('Helvetica');

  rows.forEach((row) => {
    const startY = doc.y;
    columns.forEach((column, index) => {
      doc.text(formatValue(column.value(row)), 40 + index * column.width, startY, {
        width: column.width,
        continued: index < columns.length - 1
      });
    });
    doc.text('');

    if (doc.y > 740) {
      doc.addPage();
    }
  });
}

function sendDispatchSummaryPdf(res, dispatch) {
  return sendPdf(res, `dispatch-${dispatch.dispatch_number || dispatch.id}-summary.pdf`, (doc) => {
    doc.fontSize(18).font('Helvetica-Bold').text('Dispatch Summary');
    doc.fontSize(10).font('Helvetica').text(`Generated at ${new Date().toISOString()}`);

    sectionTitle(doc, 'Dispatch');
    keyValue(doc, 'Dispatch number', dispatch.dispatch_number);
    keyValue(doc, 'Status', dispatch.status);
    keyValue(doc, 'Salesman', dispatch.salesman_name || dispatch.salesman_id);
    keyValue(doc, 'Warehouse', dispatch.warehouse_name || dispatch.warehouse_id);
    keyValue(doc, 'Request date', dispatch.request_date);
    keyValue(doc, 'Total quantity', dispatch.total_quantity);
    keyValue(doc, 'Subtotal', formatMoney(dispatch.subtotal_amount || dispatch.total_amount));
    keyValue(doc, 'VAT', formatMoney(dispatch.vat_amount));
    keyValue(doc, 'Total amount', formatMoney(dispatch.total_amount));
    keyValue(doc, 'Collected', formatMoney(dispatch.total_collected));
    keyValue(doc, 'Debt', formatMoney(dispatch.total_debt));

    sectionTitle(doc, 'Customers');
    drawRows(doc, dispatch.customers || [], [
      { label: 'Customer', width: 155, value: (row) => row.customer_name },
      { label: 'Receipt', width: 105, value: (row) => row.receipt_number },
      { label: 'Subtotal', width: 75, value: (row) => formatMoney(row.subtotal_amount || row.customer_total_amount) },
      { label: 'VAT', width: 65, value: (row) => formatMoney(row.vat_amount) },
      { label: 'Total', width: 75, value: (row) => formatMoney(row.customer_total_amount) },
      { label: 'Debt', width: 75, value: (row) => formatMoney(row.debt_amount) }
    ]);

    sectionTitle(doc, 'Items');
    drawRows(doc, dispatch.items || [], [
      { label: 'Item', width: 155, value: (row) => `${row.item_name} ${row.variant_name || ''}`.trim() },
      { label: 'SKU', width: 90, value: (row) => row.sku },
      { label: 'Qty', width: 55, value: (row) => row.quantity },
      { label: 'Price', width: 70, value: (row) => formatMoney(row.unit_price) },
      { label: 'VAT', width: 65, value: (row) => formatMoney(row.vat_amount) },
      { label: 'Total', width: 80, value: (row) => formatMoney(row.line_total) }
    ]);
  });
}

function sendDispatchCustomerReceiptsPdf(res, dispatch) {
  return sendPdf(res, `dispatch-${dispatch.dispatch_number || dispatch.id}-customer-receipts.pdf`, (doc) => {
    doc.fontSize(18).font('Helvetica-Bold').text('Customer Receipts');
    doc.fontSize(10).font('Helvetica').text(`Dispatch ${dispatch.dispatch_number || dispatch.id}`);

    (dispatch.customers || []).forEach((customer, index) => {
      if (index > 0) {
        doc.addPage();
      }

      sectionTitle(doc, 'Receipt');
      keyValue(doc, 'Receipt number', customer.receipt_number);
      keyValue(doc, 'Customer', customer.customer_name);
      keyValue(doc, 'Location', customer.sublocation_name || customer.location_name);
      keyValue(doc, 'Dispatch number', dispatch.dispatch_number);
      keyValue(doc, 'Status', customer.payment_status);
      keyValue(doc, 'Subtotal', formatMoney(customer.subtotal_amount || customer.customer_total_amount));
      keyValue(doc, 'VAT', formatMoney(customer.vat_amount));
      keyValue(doc, 'Total', formatMoney(customer.customer_total_amount));
      keyValue(doc, 'Collected', formatMoney(customer.collected_amount));
      keyValue(doc, 'Remaining', formatMoney(customer.debt_amount));

      const items = (dispatch.items || []).filter(
        (item) => Number(item.dispatch_customer_id) === Number(customer.id)
      );

      sectionTitle(doc, 'Items');
      drawRows(doc, items, [
        { label: 'Item', width: 170, value: (row) => `${row.item_name} ${row.variant_name || ''}`.trim() },
        { label: 'Qty', width: 65, value: (row) => row.quantity },
        { label: 'Price', width: 80, value: (row) => formatMoney(row.unit_price) },
        { label: 'VAT', width: 75, value: (row) => formatMoney(row.vat_amount) },
        { label: 'Total', width: 90, value: (row) => formatMoney(row.line_total) }
      ]);
    });

    if (!dispatch.customers || dispatch.customers.length === 0) {
      sectionTitle(doc, 'Receipts');
      doc.text('No customers are attached to this dispatch.');
    }
  });
}

function sendCustomerReceiptPdf(res, receipt) {
  return sendPdf(res, `receipt-${receipt.receipt_number || receipt.id}.pdf`, (doc) => {
    doc.fontSize(18).font('Helvetica-Bold').text('Customer Receipt');
    doc.fontSize(10).font('Helvetica').text(`Generated at ${new Date().toISOString()}`);

    sectionTitle(doc, 'Receipt');
    keyValue(doc, 'Receipt number', receipt.receipt_number);
    keyValue(doc, 'Customer', receipt.customer_name || receipt.customer_id);
    keyValue(doc, 'Receipt date', receipt.receipt_date);
    keyValue(doc, 'Receipt type', receipt.receipt_type);
    keyValue(doc, 'Subtotal', formatMoney(receipt.subtotal_amount || receipt.total_amount));
    keyValue(doc, 'VAT', formatMoney(receipt.vat_amount));
    keyValue(doc, 'Total amount', formatMoney(receipt.total_amount));
    keyValue(doc, 'Paid amount', formatMoney(receipt.paid_amount));
    keyValue(doc, 'Remaining amount', formatMoney(receipt.remaining_amount));
    keyValue(doc, 'Printed at', receipt.printed_at);
  });
}

module.exports = {
  sendCustomerReceiptPdf,
  sendDispatchCustomerReceiptsPdf,
  sendDispatchSummaryPdf,
  sendPdf
};
