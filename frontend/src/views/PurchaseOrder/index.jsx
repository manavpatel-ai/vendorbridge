import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  FileSignature, 
  Calendar, 
  Loader2, 
  ArrowUpRight,
  FileCheck2,
  X
} from 'lucide-react';
import api from '../../utility/api';

const PurchaseOrders = () => {
  const { user, hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer']);

  const [pos, setPos] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPo, setSelectedPo] = useState(null);
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
                          onClick={() => setSelectedPo(po)}
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
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
