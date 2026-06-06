import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { 
  FileSignature, 
  Receipt, 
  Calendar, 
  FileText, 
  Mail, 
  CreditCard, 
  Eye, 
  Loader2, 
  ArrowUpRight,
  User,
  MapPin,
  FileCheck2,
  X
} from 'lucide-react';
import api from '../lib/api';

const PurchaseOrderInvoice = () => {
  const { user, hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer']);

  const [activeTab, setActiveTab] = useState('pos'); // 'pos' or 'invoices'
  const [pos, setPos] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail panel states
  const [selectedPo, setSelectedPo] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
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
      console.error("Failed to load POs/Invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateInvoice = async (poId) => {
    setActionLoading(true);
    try {
      await api.post('/invoices/', { po_id: poId });
      alert("Invoice generated and specification PDF created successfully!");
      fetchData();
      setSelectedPo(null);
      setActiveTab('invoices'); // Switch to invoices tab
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to generate invoice");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
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
      // Reload current details
      const updatedInv = await api.get(`/invoices/${invoiceId}`);
      setSelectedInvoice(updatedInv.data);
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
    }).format(val);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDEA]">Financial Documents</h1>
        <p className="text-xs text-[#8C9A93] mt-1">
          Review generated Purchase Orders and collect invoices for approved transactions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#223027]">
        <button
          onClick={() => { setActiveTab('pos'); setSelectedPo(null); setSelectedInvoice(null); }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold cursor-pointer border-b-2 transition-all ${
            activeTab === 'pos'
              ? 'border-[#22C55E] text-[#22C55E]'
              : 'border-transparent text-[#8C9A93] hover:text-[#E8EDEA]'
          }`}
        >
          <FileSignature className="h-4 w-4" />
          <span>Purchase Orders ({pos.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('invoices'); setSelectedPo(null); setSelectedInvoice(null); }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold cursor-pointer border-b-2 transition-all ${
            activeTab === 'invoices'
              ? 'border-[#22C55E] text-[#22C55E]'
              : 'border-transparent text-[#8C9A93] hover:text-[#E8EDEA]'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Invoices ({invoices.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Document list (Left 2 cols or 1 col depending on selection) */}
          <div className={`${(selectedPo || selectedInvoice) ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-4`}>
            <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-[#0F1513] border-b border-[#223027] text-[#8C9A93]">
                      <th className="p-4 font-semibold uppercase tracking-wider">Doc Number</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Date</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Vendor</th>
                      <th className="p-4 font-semibold uppercase tracking-wider text-right">Grand Total</th>
                      <th className="p-4 font-semibold uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-[#223027]/40 bg-[#121A17]">
                    {activeTab === 'pos' ? (
                      pos.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-[#8C9A93] italic">No Purchase Orders available.</td>
                        </tr>
                      ) : (
                        pos.map(po => (
                          <tr
                            key={po.id}
                            onClick={() => { setSelectedPo(po); setSelectedInvoice(null); }}
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
                              <span className="text-[10px] bg-[#1a2d24] text-[#22C55E] px-2 py-0.5 rounded-full font-semibold">
                                {po.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )
                    ) : (
                      invoices.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-[#8C9A93] italic">No Invoices available.</td>
                        </tr>
                      ) : (
                        invoices.map(inv => (
                          <tr
                            key={inv.id}
                            onClick={() => { setSelectedInvoice(inv); setSelectedPo(null); }}
                            className={`hover:bg-[#16211d] cursor-pointer transition-colors ${
                              selectedInvoice?.id === inv.id ? 'bg-[#1a2d24]' : ''
                            }`}
                          >
                            <td className="p-4 font-mono text-[#22C55E] font-semibold flex items-center gap-1">
                              {inv.invoice_number}
                              <ArrowUpRight className="h-3 w-3 opacity-60" />
                            </td>
                            <td className="p-4 text-[#E8EDEA]">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                            <td className="p-4 text-[#E8EDEA] font-medium">{inv.vendor_name}</td>
                            <td className="p-4 text-right text-[#E8EDEA] font-semibold">{formatCurrency(inv.grand_total)}</td>
                            <td className="p-4 text-center">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                inv.status === 'paid'
                                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
                                  : inv.status === 'overdue'
                                  ? 'bg-rose-950/40 text-rose-400 border border-rose-900/60'
                                  : 'bg-amber-950/40 text-amber-400 border border-amber-900/60'
                              }`}>
                                {inv.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Details Panels (Right Column) */}
          {(selectedPo || selectedInvoice) && (
            <div className="lg:col-span-2 space-y-6 animate-fade-in">
              
              {/* PO Detail view */}
              {selectedPo && (
                <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-lg relative">
                  <button
                    onClick={() => setSelectedPo(null)}
                    className="absolute top-4 right-4 p-1 rounded-lg text-[#8C9A93] hover:text-[#E8EDEA] hover:bg-[#16211d]"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="p-6 border-b border-[#223027] bg-[#0F1513]">
                    <span className="text-[10px] font-mono text-[#22C55E] font-semibold uppercase">Purchase Order Details</span>
                    <h2 className="text-base font-bold text-[#E8EDEA] mt-1">{selectedPo.po_number}</h2>
                    <p className="text-xs text-[#8C9A93] mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Date Generated: {new Date(selectedPo.po_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Organization details */}
                    <div className="grid grid-cols-2 gap-6 text-xs text-[#8C9A93]">
                      <div>
                        <span className="font-semibold text-[#E8EDEA] uppercase text-[9px] tracking-wider block mb-1">Buyer Details</span>
                        <div className="space-y-1">
                          <p className="font-medium text-[#E8EDEA]">{selectedPo.buyer_org_name}</p>
                          <p className="leading-relaxed">{selectedPo.buyer_address}</p>
                          <p className="font-mono text-[10px]">GSTIN: {selectedPo.buyer_gstin}</p>
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-[#E8EDEA] uppercase text-[9px] tracking-wider block mb-1">Supplier Details</span>
                        <div className="space-y-1">
                          <p className="font-medium text-[#22C55E]">{selectedPo.vendor_name}</p>
                          <p className="leading-relaxed">Category: {selectedPo.vendor_category || 'IT Hardware'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="border border-[#223027] rounded-lg overflow-hidden divide-y divide-[#223027]">
                      {selectedPo.line_items?.map((item, index) => (
                        <div key={index} className="p-3 bg-[#0F1513]/40 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-[#E8EDEA]">{item.item_name}</span>
                            <span className="block text-[10px] text-[#8C9A93] mt-0.5">Quantity: {parseInt(item.quantity)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#E8EDEA] font-medium">{formatCurrency(item.unit_price)}</span>
                            <span className="block text-[10px] text-[#8C9A93] mt-0.5">Total: {formatCurrency(item.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tax Summary */}
                    <div className="border-t border-[#223027] pt-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#8C9A93]">Subtotal</span>
                        <span className="text-[#E8EDEA] font-medium">{formatCurrency(selectedPo.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8C9A93]">CGST</span>
                        <span className="text-[#E8EDEA] font-medium">{formatCurrency(selectedPo.cgst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8C9A93]">SGST</span>
                        <span className="text-[#E8EDEA] font-medium">{formatCurrency(selectedPo.sgst)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-[#223027] pt-2">
                        <span className="text-[#22C55E]">PO Grand Total</span>
                        <span className="text-[#E8EDEA]">{formatCurrency(selectedPo.grand_total)}</span>
                      </div>
                    </div>

                    {/* Generate Invoice button */}
                    {isStaff && (
                      <div className="border-t border-[#223027] pt-4">
                        {/* Check if invoice already exists for this PO */}
                        {invoices.some(inv => inv.po_number === selectedPo.po_number) ? (
                          <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-xs rounded-lg text-center font-medium">
                            Invoice has already been generated for this PO.
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateInvoice(selectedPo.id)}
                            disabled={actionLoading}
                            className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-black font-bold py-2.5 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                          >
                            {actionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileCheck2 className="h-4 w-4" />
                            )}
                            <span>Generate Invoice & Render PDF</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Invoice Detail view */}
              {selectedInvoice && (
                <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-lg relative">
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="absolute top-4 right-4 p-1 rounded-lg text-[#8C9A93] hover:text-[#E8EDEA] hover:bg-[#16211d]"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="p-6 border-b border-[#223027] bg-[#0F1513]">
                    <span className="text-[10px] font-mono text-[#22C55E] font-semibold uppercase">Invoice Details</span>
                    <h2 className="text-base font-bold text-[#E8EDEA] mt-1">{selectedInvoice.invoice_number}</h2>
                    <div className="flex gap-4 mt-2 text-xs text-[#8C9A93]">
                      <span>PO Link: <span className="font-mono text-[#E8EDEA]">{selectedInvoice.po_number}</span></span>
                      <span>Due: <span className="text-rose-400 font-semibold">{new Date(selectedInvoice.due_date).toLocaleDateString()}</span></span>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Status Display */}
                    <div className="bg-[#0B0F0E] p-4 border border-[#223027] rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[#8C9A93] uppercase text-[9px] font-semibold block">Payment Status</span>
                        <span className={`inline-block font-bold text-sm uppercase mt-1 ${
                          selectedInvoice.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {selectedInvoice.status.replace('_', ' ')}
                        </span>
                      </div>
                      {selectedInvoice.paid_at && (
                        <div className="text-right">
                          <span className="text-[#8C9A93] uppercase text-[9px] font-semibold block">Paid Timestamp</span>
                          <span className="text-[#E8EDEA] mt-1 block">
                            {new Date(selectedInvoice.paid_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Financial details */}
                    <div className="space-y-3 text-xs border-b border-[#223027]/40 pb-4">
                      <div className="flex justify-between">
                        <span className="text-[#8C9A93]">Subtotal</span>
                        <span className="text-[#E8EDEA] font-medium">{formatCurrency(selectedInvoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8C9A93]">CGST (9%)</span>
                        <span className="text-[#E8EDEA] font-medium">{formatCurrency(selectedInvoice.cgst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8C9A93]">SGST (9%)</span>
                        <span className="text-[#E8EDEA] font-medium">{formatCurrency(selectedInvoice.sgst)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-[#223027] pt-2">
                        <span className="text-[#22C55E]">Grand Total</span>
                        <span className="text-[#E8EDEA]">{formatCurrency(selectedInvoice.grand_total)}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number)}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-1.5 border border-[#223027] hover:border-[#22C55E]/40 text-[#8C9A93] hover:text-[#E8EDEA] font-semibold py-2 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View / Print PDF</span>
                      </button>

                      {isStaff && (
                        <button
                          onClick={() => handleEmailInvoice(selectedInvoice.id)}
                          disabled={actionLoading}
                          className="flex items-center justify-center gap-1.5 border border-[#223027] hover:border-[#22C55E]/40 text-[#8C9A93] hover:text-[#E8EDEA] font-semibold py-2 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45"
                        >
                          <Mail className="h-4 w-4" />
                          <span>Email Vendor</span>
                        </button>
                      )}

                      {isStaff && selectedInvoice.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                          disabled={actionLoading}
                          className="col-span-2 flex items-center justify-center gap-1.5 bg-[#22C55E] hover:bg-[#16a34a] text-black font-bold py-2.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45"
                        >
                          <CreditCard className="h-4 w-4 text-black" />
                          <span>Mark Invoice as PAID</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default PurchaseOrderInvoice;
