import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  Loader2, 
  ArrowLeft,
  Mail,
  CreditCard,
  Download,
  Printer
} from 'lucide-react';
import api from '../../utility/api';

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer']);

  const [invoice, setInvoice] = useState(null);
  const [poDetails, setPoDetails] = useState(null);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAllDetails = async () => {
    setLoading(true);
    try {
      // Fetch invoice details
      const invoiceRes = await api.get(`/invoices/${id}`);
      const invoiceData = invoiceRes.data;
      setInvoice(invoiceData);
      
      // Fetch PO details
      const poRes = await api.get(`/purchase-orders/${invoiceData.po_id}`);
      const poData = poRes.data;
      setPoDetails(poData);
      
      // Fetch Vendor details
      if (poData.vendor_id) {
        try {
          const vendorRes = await api.get(`/vendors/${poData.vendor_id}`);
          setVendorDetails(vendorRes.data);
        } catch (vErr) {
          console.warn("Failed to load vendor details:", vErr);
        }
      }
    } catch (err) {
      console.error("Failed to load invoice details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDetails();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const response = await api.get(`/invoices/${invoice.id}/pdf`, {
        responseType: 'blob'
      });
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } catch (err) {
      console.error("Failed to fetch PDF blob:", err);
      alert("Failed to render and open PDF.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmailInvoice = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await api.post(`/invoices/${invoice.id}/email`);
      alert("Invoice dispatched to vendor via email!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to email invoice.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await api.patch(`/invoices/${invoice.id}/status`, null, {
        params: { status: 'paid' }
      });
      alert("Invoice marked as PAID!");
      // Reload details
      const updatedInv = await api.get(`/invoices/${invoice.id}`);
      setInvoice(updatedInv.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to update payment status.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        <span className="text-xs text-[#8C9A93]">Loading invoice details...</span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-xs font-semibold text-[#8C9A93] hover:text-[#E8EDEA] transition-colors cursor-pointer no-print"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Invoices</span>
        </button>
        <div className="bg-[#121A17] border border-[#223027] rounded-xl p-8 text-center text-[#8C9A93]">
          Invoice not found or failed to load.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Back link */}
      <button 
        onClick={() => navigate('/invoices')}
        className="flex items-center gap-2 text-xs font-semibold text-[#8C9A93] hover:text-[#E8EDEA] transition-colors cursor-pointer no-print"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Invoices</span>
      </button>

      {/* Main Details Sheet */}
      <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-lg print-container">
        {/* Header: Title and Top Action Buttons */}
        <div className="p-6 border-b border-[#223027] bg-[#0F1513] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#E8EDEA] tracking-tight">Purchase Order & Invoice</h2>
            <p className="text-xs text-[#8C9A93] mt-1 font-mono">
              {poDetails?.po_number || invoice.po_number || 'PO-XXXX'} - auto-generated after approval
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handleDownloadPDF}
              disabled={actionLoading}
              className="flex items-center gap-1.5 border border-[#223027] hover:border-[#22C55E]/40 text-[#8C9A93] hover:text-[#E8EDEA] font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45 bg-[#121A17]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => window.print()}
              disabled={actionLoading}
              className="flex items-center gap-1.5 border border-[#223027] hover:border-[#22C55E]/40 text-[#8C9A93] hover:text-[#E8EDEA] font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45 bg-[#121A17]"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            {isStaff && (
              <button
                onClick={handleEmailInvoice}
                disabled={actionLoading}
                className="flex items-center gap-1.5 border border-[#223027] hover:border-[#22C55E]/40 text-[#8C9A93] hover:text-[#E8EDEA] font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45 bg-[#121A17]"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Email invoice</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Bill to / Vendor Details Box */}
          <div className="border border-[#223027] rounded-xl overflow-hidden bg-[#0F1513]/20">
            {/* Upper Section: Split Columns */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bill to Column */}
              <div className="space-y-2 text-xs">
                <span className="font-semibold text-[#8C9A93] uppercase text-[9px] tracking-wider block">Bill to:</span>
                <div className="space-y-1">
                  <p className="font-bold text-[#E8EDEA] text-sm">
                    {poDetails?.buyer_org_name || 'your Organization Name'}
                  </p>
                  <p className="text-[#8C9A93] leading-relaxed">
                    {poDetails?.buyer_address || '123 business park, ahmedabad'}
                  </p>
                  <p className="font-mono text-[10px] text-[#22C55E] mt-1 font-semibold">
                    GSTIN: {poDetails?.buyer_gstin || '253834384FB'}
                  </p>
                </div>
              </div>

              {/* Vendor Column */}
              <div className="space-y-2 text-xs">
                <span className="font-semibold text-[#8C9A93] uppercase text-[9px] tracking-wider block">Vendor</span>
                <div className="space-y-1">
                  <p className="font-bold text-[#22C55E] text-sm">
                    {vendorDetails?.name || invoice.vendor_name || 'Vendor Name'}
                  </p>
                  <p className="text-[#8C9A93] leading-relaxed">
                    {vendorDetails?.address || 'Vendor Address'}
                  </p>
                  <p className="font-mono text-[10px] text-[#22C55E] mt-1 font-semibold">
                    GSTIN: {vendorDetails?.gst_number || 'Vendor GSTIN'}
                  </p>
                </div>
              </div>
            </div>

            {/* Divider Line */}
            <div className="border-b border-[#223027]" />

            {/* Lower Section: Dates Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="text-[#8C9A93] w-24">PO Number:</span>
                  <span className="font-mono font-semibold text-[#E8EDEA]">
                    {poDetails?.po_number || invoice.po_number}
                  </span>
                </div>
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="text-[#8C9A93] w-24">PO date:</span>
                  <span className="text-[#E8EDEA]">
                    {poDetails?.po_date ? new Date(poDetails.po_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    }) : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="text-[#8C9A93] w-28">invoice date:</span>
                  <span className="text-[#E8EDEA]">
                    {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="text-[#8C9A93] w-28">Due date:</span>
                  <span className="text-[#E8EDEA] font-semibold text-rose-400">
                    {new Date(invoice.due_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-[#223027] rounded-xl overflow-hidden bg-[#121A17]">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#0F1513] border-b border-[#223027] text-[#8C9A93]">
                  <th className="p-4 font-semibold uppercase tracking-wider w-2/5">Item</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-center w-1/5">Qty</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-right w-1/5">Unit price</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-right w-1/5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#223027]/40">
                {poDetails?.line_items?.map((item, index) => (
                  <tr key={index} className="hover:bg-[#16211d]/20 transition-colors">
                    <td className="p-4 font-semibold text-[#E8EDEA]">{item.item_name}</td>
                    <td className="p-4 text-center text-[#E8EDEA]">{parseInt(item.quantity)}</td>
                    <td className="p-4 text-right text-[#E8EDEA]">{formatCurrency(item.unit_price)}</td>
                    <td className="p-4 text-right text-[#E8EDEA] font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end pr-4">
            <div className="w-full md:w-80 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#8C9A93]">Subtotal</span>
                <span className="text-[#E8EDEA] font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8C9A93]">CGST (9%)</span>
                <span className="text-[#E8EDEA] font-medium">{formatCurrency(invoice.cgst)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8C9A93]">SGST (9%)</span>
                <span className="text-[#E8EDEA] font-medium">{formatCurrency(invoice.sgst)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold border-t border-[#223027] pt-3">
                <span className="text-[#22C55E]">Grand total</span>
                <span className="text-[#E8EDEA] text-base">{formatCurrency(invoice.grand_total)}</span>
              </div>
            </div>
          </div>

          {/* Footer: Status Badge and Mark as Paid Action */}
          <div className="pt-4 border-t border-[#223027] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#8C9A93]">status:</span>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider ${
                invoice.status === 'paid'
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
                  : 'bg-amber-950/40 text-amber-400 border border-amber-900/60'
              }`}>
                {invoice.status === 'paid' ? 'Paid' : 'Pending Payment'}
              </span>
              
              {/* Mark as Paid Action */}
              {isStaff && invoice.status !== 'paid' && (
                <button
                  onClick={handleMarkAsPaid}
                  disabled={actionLoading}
                  className="ml-4 text-[#22C55E] hover:text-[#16a34a] font-bold cursor-pointer transition-colors hover:underline flex items-center gap-1 no-print animate-pulse"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Mark as Paid</span>
                </button>
              )}
            </div>
            
            {invoice.paid_at && (
              <span className="text-[#8C9A93] italic">
                Paid on: {new Date(invoice.paid_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;
