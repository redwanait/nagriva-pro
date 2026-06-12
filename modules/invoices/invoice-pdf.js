const NAGRIVA_InvoicePDF = (() => {
  'use strict';

  const CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  let _scriptLoaded = false;
  let _loadingPromise = null;

  function loadDependency() {
    if (_scriptLoaded) return Promise.resolve();
    if (_loadingPromise) return _loadingPromise;

    _loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CDN_URL;
      script.async = true;
      script.onload = () => {
        _scriptLoaded = true;
        resolve();
      };
      script.onerror = () => {
        _loadingPromise = null;
        reject(new Error('Failed to load PDF library. Check your internet connection.'));
      };
      document.head.appendChild(script);
    });

    return _loadingPromise;
  }

  function formatCurrency(amount) {
    return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getStatusLabel(status) {
    const map = { pending: 'Pending', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled', refunded: 'Refunded' };
    return map[status] || status || 'Unknown';
  }

  function getStatusColor(status) {
    const map = { pending: '#f59e0b', paid: '#F59E0B', overdue: '#ef4444', cancelled: '#71717a', refunded: '#F59E0B' };
    return map[status] || '#71717a';
  }

  function generateInvoiceHTML(invoice) {
    const inv = invoice;
    const statusColor = getStatusColor(inv.status);
    const statusLabel = getStatusLabel(inv.status);
    const issuedDate = formatDate(inv.issuedDate || inv.createdAt);
    const dueDate = formatDate(inv.dueDate);
    const paidDate = inv.paidDate ? formatDate(inv.paidDate) : null;
    const createdAt = formatDate(inv.createdAt);
    const notes = inv.notes || '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice ${inv.invoiceNumber || ''}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;background:#fff;padding:0;margin:0;-webkit-font-smoothing:antialiased}
.wrap{max-width:800px;margin:0 auto;padding:48px 40px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2.5px solid #FACC15;margin-bottom:32px}
.brand{display:flex;align-items:center;gap:14px}
.brand-icon{width:44px;height:44px;background:#FACC15;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.2rem;color:#050505;flex-shrink:0}
.brand-txt h1{font-weight:800;font-size:1.35rem;color:#050505;letter-spacing:0.04em;line-height:1.2}
.brand-txt span{font-size:0.62rem;color:#a1a1aa;letter-spacing:0.15em;text-transform:uppercase}
.title-area{text-align:right}
.title-area h2{font-weight:700;font-size:1.55rem;color:#050505;letter-spacing:-0.02em;line-height:1.2}
.title-area .inv-num{font-size:0.82rem;color:#71717a;margin-top:4px}
.status-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:99px;font-size:0.72rem;font-weight:600;margin-top:10px;background:${statusColor}14;border:1px solid ${statusColor}30;color:${statusColor}}
.status-dot{width:6px;height:6px;border-radius:50%;background:${statusColor};flex-shrink:0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:32px}
.grp h3{font-size:0.65rem;font-weight:600;color:#FACC15;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px}
.grp p{font-size:0.88rem;color:#1a1a2e;line-height:1.7}
.grp .lbl{font-size:0.7rem;color:#a1a1aa;font-weight:500}
.tbl{width:100%;border-collapse:collapse;margin-bottom:24px}
.tbl th{text-align:left;padding:10px 16px;font-size:0.65rem;font-weight:600;color:#FACC15;text-transform:uppercase;letter-spacing:0.08em;background:#f8fafc;border-bottom:1.5px solid #e2e8f0}
.tbl td{padding:14px 16px;font-size:0.88rem;color:#1a1a2e;border-bottom:1px solid #f1f5f9}
.tbl td:last-child{text-align:right;font-weight:600}
.tbl tr:last-child td{border-bottom:none}
.totals{margin-left:auto;width:300px;margin-bottom:32px}
.totals table{width:100%;border-collapse:collapse}
.totals td{padding:7px 16px;font-size:0.85rem;color:#1a1a2e}
.totals td:last-child{text-align:right;font-weight:500}
.totals .sub td:last-child{color:#71717a}
.totals .total td{padding:12px 16px;font-size:1.05rem;font-weight:700;border-top:2px solid #FACC15;color:#050505}
.totals .total td:last-child{color:#FACC15}
.notes-box{padding:16px 20px;background:#f8fafc;border-radius:10px;border-left:3px solid #FACC15;margin-bottom:32px}
.notes-box h4{font-size:0.65rem;font-weight:600;color:#FACC15;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px}
.notes-box p{font-size:0.82rem;color:#52525b;line-height:1.7}
.ftr{text-align:center;padding-top:24px;border-top:1px solid #e2e8f0}
.ftr p{font-size:0.7rem;color:#a1a1aa;line-height:1.8}
.ftr strong{color:#050505;font-weight:600}

.paid-stamp{display:inline-block;padding:4px 12px;border-radius:6px;font-size:0.72rem;font-weight:600;color:#F59E0B;background:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.2);margin-top:4px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.wrap{padding:24px 20px}}
</style>
</head>
<body>
<div class="wrap">

<div class="hdr">
<div class="brand">
<div class="brand-icon">N</div>
<div class="brand-txt">
<h1>Nagriva</h1>
<span>Brand Growth Platform</span>
</div>
</div>
<div class="title-area">
<h2>INVOICE</h2>
<div class="inv-num">${inv.invoiceNumber || '\u2014'}</div>
<div class="status-badge"><span class="status-dot"></span>${statusLabel}</div>
${paidDate ? `<div class="paid-stamp"><i class="lbl">Paid on:</i> ${paidDate}</div>` : ''}
</div>
</div>

<div class="grid">
<div class="grp">
<h3>From</h3>
<p><strong>Nagriva</strong><br>Brand Growth Platform<br>contact@nagriva.ai</p>
</div>
<div class="grp">
<h3>Bill To</h3>
<p><strong>${inv.clientName || 'Unknown Client'}</strong>${inv.clientEmail ? '<br>' + inv.clientEmail : ''}</p>
</div>
<div class="grp">
<h3>Invoice Details</h3>
<p>
<span class="lbl">Issued:</span> ${issuedDate}<br>
<span class="lbl">Due:</span> ${dueDate}<br>
<span class="lbl">Created:</span> ${createdAt}
</p>
</div>
<div class="grp">
<h3>Order Reference</h3>
<p>
<span class="lbl">Order:</span> ${inv.orderNumber || '\u2014'}<br>
${inv.orderService ? '<span class="lbl">Service:</span> ' + inv.orderService : ''}
</p>
</div>
</div>

<table class="tbl">
<thead><tr><th>Description</th><th style="width:140px">Amount</th></tr></thead>
<tbody>
<tr>
<td>${inv.orderService || 'Professional Service'}${inv.orderNumber ? ' (' + inv.orderNumber + ')' : ''}</td>
<td>${formatCurrency(inv.amount || 0)}</td>
</tr>
</tbody>
</table>

<div class="totals">
<table>
<tr class="sub"><td>Subtotal</td><td>${formatCurrency(inv.amount || 0)}</td></tr>
<tr class="sub"><td>Tax</td><td>${formatCurrency(inv.tax || 0)}</td></tr>
<tr class="total"><td>Total</td><td>${formatCurrency(inv.total || (inv.amount + inv.tax))}</td></tr>
</table>
</div>

${notes ? '<div class="notes-box"><h4>Notes</h4><p>' + notes.replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</p></div>' : ''}

<div class="ftr">
<p><strong>Nagriva</strong> \u2014 AI-Powered Brand Growth Platform<br>Thank you for your business.</p>
</div>

</div>
</body>
</html>`;
  }

  async function downloadInvoice(invoice) {
    if (!invoice || !invoice.id) throw new Error('Invalid invoice data');
    try {
      await loadDependency();
      const html = generateInvoiceHTML(invoice);
      const el = document.createElement('div');
      el.innerHTML = html;
      el.style.cssText = 'position:absolute;left:-9999px;top:0;';
      document.body.appendChild(el);
      const opt = {
        margin: [0.4, 0.4, 0.4, 0.4],
        filename: 'Invoice_' + (invoice.invoiceNumber || invoice.id) + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      await window.html2pdf().set(opt).from(el).save();
      document.body.removeChild(el);
    } catch (err) {
      console.error('[InvoicePDF] Download failed:', err.message || err);
      throw new Error(err.message === 'Failed to load PDF library. Check your internet connection.'
        ? err.message
        : 'Could not generate PDF. Please try again.');
    }
  }

  async function printInvoice(invoice) {
    if (!invoice || !invoice.id) throw new Error('Invalid invoice data');
    try {
      const html = generateInvoiceHTML(invoice);
      const win = window.open('', '_blank', 'width=800,height=600');
      if (!win) throw new Error('Popup blocked. Please allow popups to print invoices.');
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 600);
    } catch (err) {
      console.error('[InvoicePDF] Print failed:', err.message || err);
      throw err.message === 'Popup blocked. Please allow popups to print invoices.'
        ? err
        : new Error('Could not open print view. Please try again.');
    }
  }

  function previewInvoice(invoice, containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = generateInvoiceHTML(invoice);
  }

  return {
    downloadInvoice,
    printInvoice,
    previewInvoice,
    generateInvoiceHTML,
  };
})();
