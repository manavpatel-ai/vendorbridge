import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { Plus, Search, Calendar, FileText, ArrowRight, Eye, ShieldAlert } from 'lucide-react';
import api from '../../utility/api';

const RFQs = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer']);
  const isManager = hasRole('manager');

  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRfqs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/rfqs/', { params });
      let list = res.data;
      
      // Client-side search filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        list = list.filter(r => 
          r.rfq_number.toLowerCase().includes(query) || 
          r.title.toLowerCase().includes(query) ||
          (r.category && r.category.toLowerCase().includes(query))
        );
      }
      
      setRfqs(list);
    } catch (err) {
      console.error("Failed to fetch RFQs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqs();
  }, [statusFilter, searchTerm]);

  const handlePublish = async (rfqId) => {
    try {
      await api.post(`/rfqs/${rfqId}/publish`);
      fetchRfqs();
    } catch (err) {
      console.error("Failed to publish RFQ:", err);
      alert(err.response?.data?.detail || "Failed to publish RFQ");
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
      case 'published':
        return 'bg-sky-950/40 text-sky-400 border border-sky-900/60';
      case 'quotations_received':
        return 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/60';
      case 'under_review':
        return 'bg-amber-950/40 text-amber-400 border border-amber-900/60';
      case 'approved':
        return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60';
      case 'po_generated':
        return 'bg-purple-950/40 text-purple-400 border border-purple-900/60';
      case 'closed':
        return 'bg-zinc-900 text-zinc-500 border border-zinc-800';
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDEA]">Request for Quotations (RFQs)</h1>
          <p className="text-xs text-[#8C9A93] mt-1">
            Create RFQs, view vendor quotation submissions, and compare offers.
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => navigate('/rfqs/create')}
            className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-[#22C55E]/15"
          >
            <Plus className="h-4 w-4" />
            <span>Create RFQ</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-[#8C9A93]/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by RFQ number, title, or category..."
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
            <option value="published">Published</option>
            <option value="quotations_received">Quotations Received</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="po_generated">PO Generated</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* RFQ Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-[#121A17] rounded-xl border border-[#223027] animate-pulse"></div>
          ))}
        </div>
      ) : rfqs.length === 0 ? (
        <div className="text-center py-12 bg-[#121A17] border border-[#223027] rounded-xl">
          <p className="text-sm text-[#8C9A93]">No RFQs found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rfqs.map((rfq) => {
            // Check if vendor has already quoted (if user is vendor)
            const hasQuoted = user?.role === 'vendor' && rfq.vendors?.find(v => v.vendor_id === user.vendor_id)?.status === 'quoted';

            return (
              <div
                key={rfq.id}
                className="bg-[#121A17] border border-[#223027] rounded-xl p-5 hover:border-[#22C55E]/40 transition-all duration-200 flex flex-col justify-between shadow-md group"
              >
                <div>
                  {/* Top line */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="font-mono text-xs text-[#22C55E] font-semibold">
                        {rfq.rfq_number}
                      </span>
                      <h3 className="font-semibold text-[#E8EDEA] text-sm mt-1 group-hover:text-[#22C55E] transition-all">
                        {rfq.title}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${getStatusStyle(rfq.status)}`}>
                      {rfq.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Middle details */}
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#8C9A93] border-t border-[#223027]/40 pt-3">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      {rfq.category || 'General'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Deadline: {rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  {/* Items summary */}
                  <div className="mt-3 text-xs text-[#8C9A93]">
                    <span className="font-medium text-[#E8EDEA]">Items:</span>{' '}
                    {rfq.line_items?.map(item => `${item.item_name} (x${parseInt(item.quantity)})`).join(', ') || 'No items listed'}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="border-t border-[#223027]/40 pt-4 mt-4 flex items-center justify-between">
                  {/* Info text */}
                  <span className="text-[10px] font-semibold text-[#8C9A93] uppercase">
                    {user?.role === 'vendor' ? (
                      hasQuoted ? (
                        <span className="text-[#22C55E]">Quotation Submitted</span>
                      ) : (
                        <span className="text-amber-400">Response Pending</span>
                      )
                    ) : (
                      <span>{rfq.vendors?.length || 0} Vendors Invited</span>
                    )}
                  </span>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/rfqs/${rfq.id}`)}
                      className="flex items-center gap-1 text-[11px] font-semibold bg-[#1a2d24] text-[#22C55E] hover:bg-[#22C55E]/10 border border-[#22C55E]/20 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </button>

                    {isStaff && rfq.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(rfq.id)}
                        className="text-[11px] font-semibold bg-[#22C55E] hover:bg-[#16a34a] text-black px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      >
                        Publish
                      </button>
                    )}

                    {isStaff && (rfq.status === 'quotations_received' || rfq.status === 'under_review') && (
                      <button
                        onClick={() => navigate(`/rfqs/${rfq.id}/compare`)}
                        className="text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      >
                        Compare
                      </button>
                    )}

                    {user?.role === 'vendor' && !hasQuoted && rfq.status === 'published' && (
                      <button
                        onClick={() => navigate(`/quotations/submit?rfq=${rfq.id}`)}
                        className="flex items-center gap-1 text-[11px] font-semibold bg-[#22C55E] hover:bg-[#16a34a] text-black px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      >
                        Submit Quote
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RFQs;
