import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { History, Search, FileText, CheckCircle2, User, PlusCircle, CreditCard, Send, ShieldAlert, Loader2 } from 'lucide-react';
import api from '../lib/api';

const Activity = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  // Enforce staff roles
  useEffect(() => {
    if (!hasRole(['admin', 'procurement_officer', 'manager'])) {
      navigate('/');
    }
  }, []);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [limit, setLimit] = useState(50);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { limit };
      if (entityFilter !== 'all') params.entity_type = entityFilter;

      const res = await api.get('/activity/', { params });
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, limit]);

  const getEntityIcon = (type) => {
    switch (type) {
      case 'rfq':
        return { icon: FileText, color: 'text-sky-400 bg-sky-950/40 border-sky-900/60' };
      case 'quotation':
        return { icon: PlusCircle, color: 'text-amber-400 bg-amber-950/40 border-amber-900/60' };
      case 'approval':
        return { icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/60' };
      case 'purchase_order':
        return { icon: History, color: 'text-purple-400 bg-purple-950/40 border-purple-900/60' };
      case 'invoice':
        return { icon: CreditCard, color: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20' };
      default:
        return { icon: User, color: 'text-zinc-400 bg-zinc-800 border-zinc-700' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDEA]">Audit Trail</h1>
        <p className="text-xs text-[#8C9A93] mt-1">
          Review immutable, system-wide transaction activity logs.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#8C9A93] font-semibold uppercase tracking-wide">Filter Entity:</label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-[#0B0F0E] border border-[#223027] text-xs text-[#E8EDEA] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#22C55E]"
          >
            <option value="all">All Entities</option>
            <option value="rfq">Requests for Quotation (RFQ)</option>
            <option value="quotation">Quotations</option>
            <option value="approval">Approvals</option>
            <option value="purchase_order">Purchase Orders</option>
            <option value="invoice">Invoices</option>
            <option value="vendor">Vendors</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[#8C9A93] font-semibold uppercase tracking-wide">Limit:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="bg-[#0B0F0E] border border-[#223027] text-xs text-[#E8EDEA] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#22C55E]"
          >
            <option value={20}>Last 20</option>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
          </select>
        </div>
      </div>

      {/* Timeline Section */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-[#121A17] border border-[#223027] rounded-xl">
          <p className="text-sm text-[#8C9A93]">No audit logs available for selected filter.</p>
        </div>
      ) : (
        <div className="relative pl-6 border-l border-[#223027] space-y-6 ml-4">
          {logs.map((log) => {
            const displayConfig = getEntityIcon(log.entity_type);
            const IconComponent = displayConfig.icon;
            
            return (
              <div key={log.id} className="relative animate-fade-in group">
                {/* Timeline node */}
                <div className={`absolute -left-[38px] top-1 h-6 w-6 rounded-full flex items-center justify-center border ${displayConfig.color} z-10 transition-transform group-hover:scale-110 shadow-sm`}>
                  <IconComponent className="h-3 w-3" />
                </div>

                {/* Log Details Card */}
                <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl hover:border-[#22C55E]/30 transition-all duration-200 shadow-md">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-[#E8EDEA]">{log.actor_name || 'System'}</span>
                        <span className="text-[10px] bg-[#1a2d24] text-[#22C55E] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-[#8C9A93] capitalize">
                          ({log.entity_type.replace('_', ' ')})
                        </span>
                      </div>
                      <p className="text-xs text-[#E8EDEA] leading-relaxed pt-1">{log.description}</p>
                    </div>

                    <span className="text-[10px] text-[#8C9A93] font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-3 p-2.5 bg-[#0B0F0E] rounded-md border border-[#223027]/40 text-[10px] font-mono text-[#8C9A93] overflow-x-auto">
                      <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Activity;
