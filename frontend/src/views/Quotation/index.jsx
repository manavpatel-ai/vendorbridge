import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  FileText, 
  Search, 
  Calendar, 
  TrendingUp, 
  Eye, 
  Loader2, 
  X, 
  ArrowUpRight,
  User,
  CreditCard,
  Clock,
  ShieldCheck,
  Building
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

  // Calculate reactive counts for tabs
  const counts = {
    all: quotations.length,
    draft: quotations.filter(q => q.status === 'draft').length,
    submitted: quotations.filter(q => q.status === 'submitted').length,
    selected: quotations.filter(q => q.status === 'selected').length,
    rejected: quotations.filter(q => q.status === 'rejected').length
  };

  const filteredQuotations = quotations.filter(q => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      q.quotation_number.toLowerCase().includes(query) ||
      (q.vendor_name && q.vendor_name.toLowerCase().includes(query));
      
    const matchesStatus = statusFilter ? q.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 w-full max-w-[95%] lg:max-w-[90%] xl:max-w-[85%] mx-auto">
      {/* Header aligned with premium styling */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E8EDEA] tracking-tight">Quotations</h1>
          <p className="text-xs sm:text-sm text-[#8C9A93] mt-1 font-medium">
            {isStaff 
              ? "Analyze submitted vendor quotes, check pricing, and track approvals"
              : "Manage your submitted quotes and track approval status"
            }
          </p>
        </div>
      </div>

      {/* Toolbar Search Input */}
      <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl shadow-md space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-3 h-5 w-5 text-[#8C9A93]/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by quotation number or vendor partner..."
            className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg pl-12 pr-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/30 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2 overflow-x-auto py-1 border-t border-[#223027]/40 pt-4">
          {[
            { label: 'All', value: '', count: counts.all },
            { label: 'Draft', value: 'draft', count: counts.draft },
            { label: 'Submitted', value: 'submitted', count: counts.submitted },
            { label: 'Selected', value: 'selected', count: counts.selected },
            { label: 'Rejected', value: 'rejected', count: counts.rejected }
          ].map(tab => (
            <button
              key={tab.label}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap capitalize ${
                statusFilter === tab.value
                  ? 'bg-[#1a2d24] text-[#22C55E] border border-[#22C55E]/30'
                  : 'text-[#8C9A93] hover:text-[#E8EDEA] border border-transparent'
              }`}
            >
              {tab.label} <span className="text-[10px] opacity-75 font-mono ml-1">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quotations Main Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="text-center py-16 bg-[#121A17] border border-[#223027] rounded-xl">
          <p className="text-sm text-[#8C9A93] italic">No quotations found matching your criteria.</p>
        </div>
      ) : (
        <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-[#0F1513] border-b border-[#223027] text-[#8C9A93]">
                  <th className="p-4 font-semibold uppercase tracking-wider">Quote Number</th>
                  {isStaff && <th className="p-4 font-semibold uppercase tracking-wider">Vendor</th>}
                  <th className="p-4 font-semibold uppercase tracking-wider">Delivery Time</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-right">Grand Total</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Status</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#223027]/40 bg-[#121A17]">
                {filteredQuotations.map(q => (
                  <tr
                    key={q.id}
                    className="hover:bg-[#16211d]/50 transition-colors"
                  >
                    {/* Quotation number link format */}
                    <td className="p-4">
                      <span className="font-mono text-[#22C55E] font-bold text-sm flex items-center gap-1">
                        {q.quotation_number}
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-50" />
                      </span>
                    </td>

                    {/* Vendor name */}
                    {isStaff && (
                      <td className="p-4 font-medium text-[#E8EDEA]">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-[#8C9A93]" />
                          <span>{q.vendor_name}</span>
                        </div>
                      </td>
                    )}

                    {/* Delivery days */}
                    <td className="p-4 text-[#E8EDEA] font-medium">
                      {q.delivery_days ? `${q.delivery_days} Days` : 'Not Specified'}
                    </td>

                    {/* Grand total */}
                    <td className="p-4 text-right text-[#E8EDEA] font-semibold font-mono">
                      {formatCurrency(q.grand_total)}
                    </td>

                    {/* Status pill badge */}
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${getStatusStyle(q.status)}`}>
                        {q.status}
                      </span>
                    </td>

                    {/* Action button */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedQuotation(q)}
                        className="px-4 py-1.5 border border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E] hover:text-black font-semibold rounded-lg transition-all duration-200 cursor-pointer text-xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer backdrop */}
      {selectedQuotation && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 transition-all duration-300"
          onClick={() => setSelectedQuotation(null)}
        />
      )}

      {/* Drawer slide-over Panel */}
      <div className={`fixed inset-y-0 right-0 w-full sm:max-w-lg bg-[#121A17] border-l border-[#223027] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        selectedQuotation ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {selectedQuotation && (
          <div className="h-full flex flex-col justify-between">
            {/* Drawer Header */}
            <div className="p-6 border-b border-[#223027] bg-[#0F1513] flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono text-[#22C55E] font-semibold uppercase">Quotation Profile</span>
                <h2 className="text-base font-bold text-[#E8EDEA] mt-0.5">Details Overview</h2>
              </div>
              <button
                onClick={() => setSelectedQuotation(null)}
                className="p-1.5 rounded-lg text-[#8C9A93] hover:text-[#E8EDEA] hover:bg-[#16211d] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Circular initial avatar block */}
              <div className="flex items-center gap-4 bg-[#0B0F0E] p-4 rounded-xl border border-[#223027]/80">
                <div className="h-14 w-14 rounded-full bg-[#1b3d2b] border border-[#22C55E] flex items-center justify-center text-xl font-bold text-[#22C55E] shadow-inner flex-shrink-0 font-mono">
                  Q
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#E8EDEA] text-base truncate font-mono">{selectedQuotation.quotation_number}</h3>
                  <div className="flex gap-2 items-center mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${getStatusStyle(selectedQuotation.status)}`}>
                      {selectedQuotation.status}
                    </span>
                    {selectedQuotation.submitted_at && (
                      <span className="text-[10px] text-[#8C9A93] flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(selectedQuotation.submitted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Vendor details */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="h-4 w-4" />
                  Supplier Details
                </h4>
                <div className="bg-[#0F1513]/40 border border-[#223027] p-4 rounded-xl space-y-2 text-xs">
                  <div>
                    <span className="text-[#8C9A93] block text-[10px] uppercase">Vendor Name</span>
                    <span className="text-[#E8EDEA] font-semibold text-sm mt-0.5 block">{selectedQuotation.vendor_name || 'System Vendor'}</span>
                  </div>
                  {selectedQuotation.vendor_rating && (
                    <div className="flex items-center text-amber-400 text-xs font-semibold gap-1 pt-1.5 border-t border-[#223027]/40 mt-1.5">
                      <span>Rating:</span>
                      <span>★ {selectedQuotation.vendor_rating.toFixed(1)} / 5.0</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms and Delivery terms details */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Fulfillment & Payment
                </h4>
                <div className="bg-[#0F1513]/40 border border-[#223027] p-4 rounded-xl space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[#8C9A93] block text-[10px] uppercase">Lead Time</span>
                      <span className="text-[#E8EDEA] font-semibold mt-0.5 block">{selectedQuotation.delivery_days ? `${selectedQuotation.delivery_days} Days` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[#8C9A93] block text-[10px] uppercase">GST/Tax Applied</span>
                      <span className="text-[#E8EDEA] font-semibold mt-0.5 block">{selectedQuotation.tax_percent}%</span>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-[#223027]/40">
                    <span className="text-[#8C9A93] block text-[10px] uppercase">Payment Terms</span>
                    <p className="text-[#E8EDEA] font-medium mt-0.5 leading-relaxed italic">
                      "{selectedQuotation.payment_terms || 'Not Specified'}"
                    </p>
                  </div>
                  {selectedQuotation.notes && (
                    <div className="pt-2.5 border-t border-[#223027]/40">
                      <span className="text-[#8C9A93] block text-[10px] uppercase">Additional Notes</span>
                      <p className="text-[#E8EDEA] mt-0.5 leading-relaxed">
                        {selectedQuotation.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List inside Quotation */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Quoted Line Items
                </h4>
                <div className="border border-[#223027] rounded-lg overflow-hidden divide-y divide-[#223027] bg-[#0F1513]/20 text-xs">
                  {selectedQuotation.line_items?.map((item, idx) => (
                    <div key={idx} className="p-3 bg-[#0F1513]/40 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-[#E8EDEA]">{item.item_name}</span>
                        <span className="block text-[10px] text-[#8C9A93] mt-0.5">Quantity: {parseInt(item.quantity)} {item.delivery_days ? `(Delivery: ${item.delivery_days} Days)` : ''}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#E8EDEA]">{formatCurrency(item.unit_price)}</span>
                        <span className="block text-[10px] text-[#8C9A93] mt-0.5">Total: {formatCurrency(item.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Totals breakdown summary */}
              <div className="bg-[#0B0F0E] border border-[#223027] p-4 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8C9A93]">Subtotal</span>
                  <span className="text-[#E8EDEA] font-mono">{formatCurrency(selectedQuotation.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C9A93]">GST / Tax ({selectedQuotation.tax_percent}%)</span>
                  <span className="text-[#E8EDEA] font-mono">{formatCurrency(selectedQuotation.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-[#223027] pt-2">
                  <span className="text-[#22C55E]">Quotation Grand Total</span>
                  <span className="text-[#E8EDEA] font-mono">{formatCurrency(selectedQuotation.grand_total)}</span>
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#223027] bg-[#0F1513] text-center">
              <button
                onClick={() => setSelectedQuotation(null)}
                className="w-full bg-[#16211d] border border-[#223027] hover:border-[#22C55E]/40 text-[#E8EDEA] hover:text-[#22C55E] font-semibold py-2 rounded-lg text-xs cursor-pointer transition-all"
              >
                Close Drawer
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Quotations;
