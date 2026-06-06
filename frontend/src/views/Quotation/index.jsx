import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  FileText, 
  Search, 
  Calendar, 
  Loader2, 
  ArrowUpRight,
  Clock,
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
  const navigate = useNavigate();

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
    <div className="space-y-8 w-full">
      {/* Header aligned with premium styling */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E8EDEA] tracking-tight">Quotations</h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-medium">
            {isStaff 
              ? "Analyze submitted vendor quotes, check pricing, and track approvals"
              : "Manage your submitted quotes and track approval status"
            }
          </p>
        </div>
      </div>

      {/* Toolbar Search Input */}
      <div className="bg-[#0B0F0E] border border-[#223027] p-5 rounded-xl shadow-md space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-3 h-5 w-5 text-[#94A3B8]/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by quotation number or vendor partner..."
            className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg pl-12 pr-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#94A3B8]/30 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all"
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
                  : 'text-[#94A3B8] hover:text-[#E8EDEA] border border-transparent'
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
        <div className="text-center py-16 bg-[#0B0F0E] border border-[#223027] rounded-xl">
          <p className="text-sm text-[#94A3B8] italic">No quotations found matching your criteria.</p>
        </div>
      ) : (
        <div className="bg-[#0B0F0E] border border-[#223027] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-[#0F1513] border-b border-[#223027] text-[#94A3B8]">
                  <th className="p-4 font-semibold uppercase tracking-wider">Quote Number</th>
                  {isStaff && <th className="p-4 font-semibold uppercase tracking-wider">Vendor</th>}
                  <th className="p-4 font-semibold uppercase tracking-wider">Delivery Time</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-right">Grand Total</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Status</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#223027]/40 bg-[#0B0F0E]">
                {filteredQuotations.map(q => (
                  <tr
                    key={q.id}
                    className="hover:bg-[#16211d]/50 transition-colors"
                  >
                    {/* Quotation number link format */}
                    <td className="p-4">
                      <button
                        onClick={() => navigate(`/quotations/${q.id}`)}
                        className="font-mono text-[#22C55E] font-bold text-sm flex items-center gap-1 hover:underline"
                      >
                        {q.quotation_number}
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-50" />
                      </button>
                    </td>

                    {/* Vendor name */}
                    {isStaff && (
                      <td className="p-4 font-medium text-[#E8EDEA]">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-[#94A3B8]" />
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
                        onClick={() => navigate(`/quotations/${q.id}`)}
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
    </div>
  );
};

export default Quotations;
