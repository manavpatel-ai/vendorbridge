import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  FileText, 
  Search, 
  Calendar, 
  DollarSign, 
  User, 
  TrendingUp, 
  Eye, 
  Loader2, 
  X, 
  ArrowUpRight 
} from 'lucide-react';
import api from '../../utility/api';

const Quotations = () => {
  const { user, hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer', 'manager']);

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations/');
      setQuotations(res.data);
    } catch (err) {
      console.error("Failed to load quotations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
      case 'submitted':
        return 'bg-sky-950/40 text-sky-400 border border-sky-900/60';
      case 'selected':
        return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60';
      case 'rejected':
        return 'bg-rose-950/40 text-rose-400 border border-rose-900/60';
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  };

  const filteredQuotations = quotations.filter(q => {
    // Client-side filtering
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      q.quotation_number.toLowerCase().includes(query) ||
      (q.vendor_name && q.vendor_name.toLowerCase().includes(query));
      
    const matchesStatus = statusFilter ? q.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDEA]">Quotations</h1>
        <p className="text-xs text-[#8C9A93] mt-1">
          {isStaff 
            ? "Analyze submitted vendor quotes and compare pricing, delivery timelines, and terms."
            : "Manage your submitted quotes and track approval status."
          }
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-[#8C9A93]/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by quote number or vendor..."
            className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg pl-10 pr-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/30 focus:outline-none focus:border-[#22C55E]"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0B0F0E] border border-[#223027] text-xs text-[#E8EDEA] rounded-lg px-3 py-2 focus:outline-none focus:border-[#22C55E]"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* List table */}
          <div className={`${selectedQuotation ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-4`}>
            <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-[#0F1513] border-b border-[#223027] text-[#8C9A93]">
                      <th className="p-4 font-semibold uppercase tracking-wider">Quote Number</th>
                      {isStaff && <th className="p-4 font-semibold uppercase tracking-wider">Vendor</th>}
                      <th className="p-4 font-semibold uppercase tracking-wider">Delivery Time</th>
                      <th className="p-4 font-semibold uppercase tracking-wider text-right">Grand Total</th>
                      <th className="p-4 font-semibold uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#223027]/40 bg-[#121A17]">
                    {filteredQuotations.length === 0 ? (
                      <tr>
                        <td colSpan={isStaff ? 5 : 4} className="p-8 text-center text-[#8C9A93] italic">No quotations found.</td>
                      </tr>
                    ) : (
                      filteredQuotations.map(q => (
                        <tr
                          key={q.id}
                          onClick={() => setSelectedQuotation(q)}
                          className={`hover:bg-[#16211d] cursor-pointer transition-colors ${
                            selectedQuotation?.id === q.id ? 'bg-[#1a2d24]' : ''
                          }`}
                        >
                          <td className="p-4 font-mono text-[#22C55E] font-semibold flex items-center gap-1">
                            {q.quotation_number}
                            <ArrowUpRight className="h-3 w-3 opacity-60" />
                          </td>
                          {isStaff && (
                            <td className="p-4 text-[#E8EDEA] font-medium flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-[#8C9A93]" />
                              <span>{q.vendor_name}</span>
                            </td>
                          )}
                          <td className="p-4 text-[#E8EDEA]">
                            {q.delivery_days ? `${q.delivery_days} Days` : 'Not Specified'}
                          </td>
                          <td className="p-4 text-right text-[#E8EDEA] font-semibold">
                            {formatCurrency(q.grand_total)}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${getStatusStyle(q.status)}`}>
                              {q.status}
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

          {/* Details Sidebar Panel */}
          {selectedQuotation && (
            <div className="lg:col-span-2 space-y-6 animate-fade-in">
              <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-lg relative">
                <button
                  onClick={() => setSelectedQuotation(null)}
                  className="absolute top-4 right-4 p-1 rounded-lg text-[#8C9A93] hover:text-[#E8EDEA] hover:bg-[#16211d]"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="p-6 border-b border-[#223027] bg-[#0F1513]">
                  <span className="text-[10px] font-mono text-[#22C55E] font-semibold uppercase">Quotation Overview</span>
                  <h2 className="text-base font-bold text-[#E8EDEA] mt-1">{selectedQuotation.quotation_number}</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#8C9A93]">
                    {selectedQuotation.submitted_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Submitted: {new Date(selectedQuotation.submitted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Vendor profile */}
                  <div className="bg-[#0B0F0E] p-4 border border-[#223027] rounded-lg text-xs space-y-2">
                    <span className="text-[#8C9A93] uppercase text-[9px] font-semibold block tracking-wider">Vendor Details</span>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-sm text-[#E8EDEA]">{selectedQuotation.vendor_name}</p>
                        <p className="text-[#8C9A93] mt-0.5">Rating: {selectedQuotation.vendor_rating ? `★ ${selectedQuotation.vendor_rating.toFixed(1)}` : 'No rating'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment and Delivery terms */}
                  <div className="grid grid-cols-2 gap-4 text-xs text-[#8C9A93]">
                    <div>
                      <span className="font-semibold text-[#E8EDEA] uppercase text-[9px] block mb-1 tracking-wider">Payment Terms</span>
                      <p className="bg-[#0F1513]/40 border border-[#223027]/40 rounded p-2 text-[#E8EDEA]">{selectedQuotation.payment_terms || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-[#E8EDEA] uppercase text-[9px] block mb-1 tracking-wider">Notes / Comments</span>
                      <p className="bg-[#0F1513]/40 border border-[#223027]/40 rounded p-2 text-[#E8EDEA]">{selectedQuotation.notes || 'None'}</p>
                    </div>
                  </div>

                  {/* Items list */}
                  <div>
                    <span className="font-semibold text-[#E8EDEA] uppercase text-[9px] block mb-2 tracking-wider">Line Items</span>
                    <div className="border border-[#223027] rounded-lg overflow-hidden divide-y divide-[#223027]">
                      {selectedQuotation.line_items?.map((item, idx) => (
                        <div key={idx} className="p-3 bg-[#0F1513]/20 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-medium text-[#E8EDEA]">{item.item_name}</span>
                            <span className="block text-[10px] text-[#8C9A93] mt-0.5">Qty: {parseInt(item.quantity)} {item.delivery_days ? `(Delivery: ${item.delivery_days} Days)` : ''}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#E8EDEA] font-semibold">{formatCurrency(item.unit_price)}</span>
                            <span className="block text-[10px] text-[#8C9A93] mt-0.5">Total: {formatCurrency(item.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Summary */}
                  <div className="border-t border-[#223027] pt-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#8C9A93]">Subtotal</span>
                      <span className="text-[#E8EDEA] font-medium">{formatCurrency(selectedQuotation.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8C9A93]">Tax ({selectedQuotation.tax_percent}%)</span>
                      <span className="text-[#E8EDEA] font-medium">{formatCurrency(selectedQuotation.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-[#223027] pt-2">
                      <span className="text-[#22C55E]">Quote Total</span>
                      <span className="text-[#E8EDEA]">{formatCurrency(selectedQuotation.grand_total)}</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default Quotations;
