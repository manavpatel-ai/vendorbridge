import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utility/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, FileText, User, Loader2 } from 'lucide-react';
import api from '../../utility/api';

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
  const [limit] = useState(50); // Muted from dropdown to keep layout sketch-matched and clean

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
  }, [entityFilter]);

  const formatLogDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const day = d.getDate();
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  };

  const getLogDisplay = (log) => {
    const action = log.action?.toLowerCase() || '';
    const desc = log.description?.toLowerCase() || '';
    const entity = log.entity_type?.toLowerCase() || '';

    // 1. Success / Checkmark: quotation selected, approval completed, marked paid
    if (
      action === 'selected' || 
      action === 'approved' || 
      action === 'paid' || 
      desc.includes('selected') || 
      desc.includes('approved') || 
      desc.includes('paid')
    ) {
      return {
        icon: CheckCircle2,
        bgColor: 'bg-emerald-950/20 dark:bg-emerald-950/20 bg-emerald-50',
        borderColor: 'border-emerald-500/20 dark:border-emerald-500/20 border-emerald-500/30',
        textColor: 'text-emerald-400 dark:text-emerald-400 text-emerald-600',
      };
    }

    // 2. Pending / Clock: pending L1/L2, awaiting, overdue
    if (
      action.includes('pending') || 
      desc.includes('pending') || 
      desc.includes('awaiting')
    ) {
      return {
        icon: Clock,
        bgColor: 'bg-blue-950/20 dark:bg-blue-950/20 bg-blue-50',
        borderColor: 'border-blue-500/20 dark:border-blue-500/20 border-blue-500/30',
        textColor: 'text-blue-400 dark:text-blue-400 text-blue-600',
      };
    }

    // 3. Vendor: added/updated vendor
    if (entity === 'vendor' || action.includes('vendor') || desc.includes('vendor')) {
      return {
        icon: User,
        bgColor: 'bg-pink-950/20 dark:bg-pink-950/20 bg-pink-50',
        borderColor: 'border-pink-500/20 dark:border-pink-500/20 border-pink-500/30',
        textColor: 'text-pink-400 dark:text-pink-400 text-pink-600',
      };
    }

    // 4. Default Document / RFQ / PO / Invoice:
    return {
      icon: FileText,
      bgColor: 'bg-sky-950/20 dark:bg-sky-950/20 bg-sky-50',
      borderColor: 'border-sky-500/20 dark:border-sky-500/20 border-sky-500/30',
      textColor: 'text-sky-400 dark:text-sky-400 text-sky-600',
    };
  };

  const filterOptions = [
    { name: 'All', value: 'all' },
    { name: 'RFQ', value: 'rfq' },
    { name: 'Approvals', value: 'approval' },
    { name: 'Invoices', value: 'invoice' },
    { name: 'Vendors', value: 'vendor' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#E8EDEA] tracking-tight">Activity & Logs</h1>
        <p className="text-[11px] sm:text-xs text-[#94A3B8] mt-1">
          Procurement audit trail
        </p>
      </div>

      {/* Filter Tabs Row */}
      <div className="flex flex-wrap gap-2 sm:gap-3 py-2 border-b border-[#223027]/40 pb-4">
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setEntityFilter(opt.value)}
            className={`px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer ${
              entityFilter === opt.value
                ? 'bg-[#93C5FD] border-[#2563EB] text-[#1E3A8A] font-semibold dark:bg-[#1E3A8A]/35 dark:border-[#3B82F6]/60 dark:text-[#60A5FA] shadow-sm'
                : 'bg-transparent text-[#94A3B8] border-[#223027] hover:text-[#E8EDEA] hover:border-[#94A3B8]/40'
            }`}
          >
            {opt.name}
          </button>
        ))}
      </div>

      {/* Main Feed Container */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-[#0B0F0E] border border-[#223027] rounded-xl">
          <p className="text-xs sm:text-sm text-[#94A3B8] italic">No audit trail logs available for this filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#223027]/40">
          {logs.map((log) => {
            const display = getLogDisplay(log);
            const IconComponent = display.icon;
            
            return (
              <div key={log.id} className="flex items-start gap-3 sm:gap-4 py-4 sm:py-5 animate-fade-in group">
                {/* Circular Icon Container */}
                <div className={`h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 rounded-full border flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm ${display.bgColor} ${display.borderColor} ${display.textColor}`}>
                  <IconComponent className="h-4 w-4 sm:h-5 w-5" />
                </div>

                {/* Log Text Content */}
                <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
                  <p className="text-xs sm:text-sm text-[#E8EDEA] font-medium leading-relaxed">
                    {log.description}
                  </p>
                  <p className="text-[10px] sm:text-xs text-[#94A3B8] mt-1 sm:mt-1.5 font-medium lowercase">
                    {formatLogDate(log.created_at)}
                  </p>
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
