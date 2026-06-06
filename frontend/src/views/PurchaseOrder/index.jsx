import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  FileSignature, 
  Calendar, 
  Loader2, 
  ArrowUpRight,
  FileCheck2,
  X,
  Printer,
  Download,
  Mail,
  CreditCard
} from 'lucide-react';
import api from '../../utility/api';

const PurchaseOrders = () => {
  const { user, hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer']);

  const [pos, setPos] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPo, setSelectedPo] = useState(null);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [posRes, invoicesRes] = await Promise.all([
        api.get('/purchase-orders/'),
        api.get('/invoices/')
      ]);
      setPos(posRes.data);
      setInvoices(invoicesRes.data);
    } catch (err) {
      console.error("Failed to load POs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectPo = async (po) => {
    setSelectedPo(po);
    setDetailsLoading(true);
    setVendorDetails(null);
    try {
      if (po.vendor_id) {
        const vendorRes = await api.get(`/vendors/${po.vendor_id}`);
        setVendorDetails(vendorRes.data);
      }
    } catch (err) {
      console.error("Failed to load PO vendor details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDownloadPDF = async (invoiceId) => {
    setActionLoading(true);
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
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

  const handleEmailInvoice = async (invoiceId) => {
    setActionLoading(true);
    try {
      await api.post(`/invoices/${invoiceId}/email`);
      alert("Invoice dispatched to vendor via email!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to email invoice.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    setActionLoading(true);
    try {
      await api.patch(`/invoices/${invoiceId}/status`, null, {
        params: { status: 'paid' }
      });
      alert("Invoice marked as PAID!");
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to update payment status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async (poId) => {
    setActionLoading(true);
    try {
      await api.post('/invoices/', { po_id: poId });
      alert("Invoice generated and specification PDF created successfully!");
      fetchData();
      setSelectedPo(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to generate invoice");
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val);
  };

  const relatedInvoice = selectedPo ? invoices.find(inv => inv.po_id === selectedPo.id) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDEA]">Purchase Orders</h1>
        <p className="text-xs text-[#8C9A93] mt-1">
          Review and manage generated Purchase Orders for approved procurement transactions.
        </p>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PO List */}
          <div className={`${selectedPo ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-4`}>
            <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-[#0F1513] border-b border-[#223027] text-[#8C9A93]">
                      <th className="p-4 font-semibold uppercase tracking-wider">PO Number</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Date</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Vendor</th>
                      <th className="p-4 font-semibold uppercase tracking-wider text-right">Grand Total</th>
                      <th className="p-4 font-semibold uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-[#223027]/40 bg-[#121A17]">
                    {pos.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-[#8C9A93] italic">No Purchase Orders available.</td>
                      </tr>
                    ) : (
                      pos.map(po => (
                        <tr
                          key={po.id}
                          onClick={() => handleSelectPo(po)}
                          className={`hover:bg-[#16211d] cursor-pointer transition-colors ${
                            selectedPo?.id === po.id ? 'bg-[#1a2d24]' : ''
                          }`}
                        >
                          <td className="p-4 font-mono text-[#22C55E] font-semibold flex items-center gap-1">
                            {po.po_number}
                            <ArrowUpRight className="h-3 w-3 opacity-60" />
                          </td>
                          <td className="p-4 text-[#E8EDEA]">{new Date(po.po_date).toLocaleDateString()}</td>
                          <td className="p-4 text-[#E8EDEA] font-medium">{po.vendor_name}</td>
                          <td className="p-4 text-right text-[#E8EDEA] font-semibold">{formatCurrency(po.grand_total)}</td>
                          <td className="p-4 text-center">
                            <span className="text-[10px] bg-[#1a2d24] text-[#22C55E] px-2 py-0.5 rounded-full font-semibold capitalize">
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Details Panel */}
          {selectedPo && (
            <div className="lg:col-span-2 space-y-6 animate-fade-in">
              <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-lg relative print-container">
                {/* Close button - hidden in print */}
                <button
                  onClick={() => setSelectedPo(null)}
                  className="absolute top-4 right-4 p-1 rounded-lg text-[#8C9A93] hover:text-[#E8EDEA] hover:bg-[#16211d] no-print z-10"
                >
                  <X className="h-4 w-4" />
                </button>

                {detailsLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
                    <span className="text-xs text-[#8C9A93]">Loading document details...</span>
                  </div>
                ) : (
                  <>
                    {/* Header: Title and Top Action Buttons */}
                    <div className="p-6 border-b border-[#223027] bg-[#0F1513] flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-[#E8EDEA] tracking-tight">Purchase Order & Invoice</h2>
                        <p className="text-xs text-[#8C9A93] mt-1 font-mono">
                          {selectedPo.po_number} - auto-generated after approval
                        </p>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 no-print">
                        {relatedInvoice && (
                          <button
                            onClick={() => handleDownloadPDF(relatedInvoice.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 border border-[#223027] hover:border-[#22C55E]/40 text-[#8C9A93] hover:text-[#E8EDEA] font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45 bg-[#121A17]"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download PDF</span>
                          </button>
                        )}
                        <button
                          onClick={() => window.print()}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 border border-[#223027] hover:border-[#22C55E]/40 text-[#8C9A93] hover:text-[#E8EDEA] font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45 bg-[#121A17]"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print</span>
                        </button>
                        {isStaff && relatedInvoice && (
                          <button
                            onClick={() => handleEmailInvoice(relatedInvoice.id)}
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
                                {selectedPo.buyer_org_name || 'your Organization Name'}
                              </p>
                              <p className="text-[#8C9A93] leading-relaxed">
                                {selectedPo.buyer_address || 'Corporate Head Office, India'}
                              </p>
                              <p className="font-mono text-[10px] text-[#22C55E] mt-1 font-semibold">
                                GSTIN: {selectedPo.buyer_gstin || '29AAAAA1111A1Z1'}
                              </p>
                            </div>
                          </div>

                          {/* Vendor Column */}
                          <div className="space-y-2 text-xs">
                            <span className="font-semibold text-[#8C9A93] uppercase text-[9px] tracking-wider block">Vendor</span>
                            <div className="space-y-1">
                              <p className="font-bold text-[#22C55E] text-sm">
                                {selectedPo.vendor_name || 'Vendor Name'}
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
                                {selectedPo.po_number}
                              </span>
                            </div>
                            <div className="flex justify-between md:justify-start gap-4">
                              <span className="text-[#8C9A93] w-24">PO date:</span>
                              <span className="text-[#E8EDEA]">
                                {selectedPo.po_date ? new Date(selectedPo.po_date).toLocaleDateString('en-IN', {
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
                                {relatedInvoice ? new Date(relatedInvoice.invoice_date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                }) : 'Not Generated'}
                              </span>
                            </div>
                            <div className="flex justify-between md:justify-start gap-4">
                              <span className="text-[#8C9A93] w-28">Due date:</span>
                              <span className={`text-[#E8EDEA] ${relatedInvoice ? 'font-semibold text-rose-400' : ''}`}>
                                {relatedInvoice ? new Date(relatedInvoice.due_date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                }) : 'Not Generated'}
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
                            {selectedPo.line_items?.map((item, index) => (
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
                            <span className="text-[#E8EDEA] font-medium">{formatCurrency(selectedPo.subtotal)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#8C9A93]">CGST (9%)</span>
                            <span className="text-[#E8EDEA] font-medium">{formatCurrency(selectedPo.cgst)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#8C9A93]">SGST (9%)</span>
                            <span className="text-[#E8EDEA] font-medium">{formatCurrency(selectedPo.sgst)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm font-bold border-t border-[#223027] pt-3">
                            <span className="text-[#22C55E]">Grand total</span>
                            <span className="text-[#E8EDEA] text-base">{formatCurrency(selectedPo.grand_total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Status Badge and Actions */}
                      <div className="pt-4 border-t border-[#223027] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[#8C9A93]">status:</span>
                          {relatedInvoice ? (
                            <>
                              <span className={`text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider ${
                                relatedInvoice.status === 'paid'
                                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
                                  : 'bg-amber-950/40 text-amber-400 border border-amber-900/60'
                              }`}>
                                {relatedInvoice.status === 'paid' ? 'Paid' : 'Pending Payment'}
                              </span>
                              
                              {isStaff && relatedInvoice.status !== 'paid' && (
                                <button
                                  onClick={() => handleMarkAsPaid(relatedInvoice.id)}
                                  disabled={actionLoading}
                                  className="ml-4 text-[#22C55E] hover:text-[#16a34a] font-bold cursor-pointer transition-colors hover:underline flex items-center gap-1 no-print animate-pulse"
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                  <span>Mark as Paid</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider bg-rose-950/40 text-rose-400 border border-rose-900/60">
                                Invoice Pending
                              </span>

                              {isStaff && (
                                <button
                                  onClick={() => handleGenerateInvoice(selectedPo.id)}
                                  disabled={actionLoading}
                                  className="ml-4 text-[#22C55E] hover:text-[#16a34a] font-bold cursor-pointer transition-colors hover:underline flex items-center gap-1 no-print animate-pulse"
                                >
                                  <FileCheck2 className="h-3.5 w-3.5" />
                                  <span>Generate Invoice</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {relatedInvoice?.paid_at && (
                          <span className="text-[#8C9A93] italic">
                            Paid on: {new Date(relatedInvoice.paid_at).toLocaleString('en-IN', {
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
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
