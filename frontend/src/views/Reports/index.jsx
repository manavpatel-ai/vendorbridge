import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utility/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  Calendar, 
  Loader2 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import api from '../../utility/api';

const Reports = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  // Enforce staff roles
  useEffect(() => {
    if (!hasRole(['admin', 'procurement_officer', 'manager'])) {
      navigate('/');
    }
  }, []);

  // Default to current month (YYYY-MM format)
  const getCurrentMonth = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/analytics', {
        params: { month: selectedMonth }
      });
      setAnalytics(res.data);
    } catch (err) {
      console.error("Failed to load reports analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedMonth]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await api.get('/reports/export', {
        params: { month: selectedMonth },
        responseType: 'blob'
      });
      
      const file = new Blob([response.data], { type: 'text/csv' });
      const fileURL = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Procurement_Report_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export CSV:", err);
      alert("Error generating report file.");
    } finally {
      setExporting(false);
    }
  };

  const formatMonthTitle = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const months = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${months[monthIndex]} ${year}`;
  };

  const formatMonthPill = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const shortMonths = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${shortMonths[monthIndex]} ${year}`;
  };

  const formatSpendKPI = (val) => {
    if (val === undefined || val === null) return '0.0 L';
    return `${(val / 100000).toFixed(1)} L`;
  };

  const formatCategorySpend = (val) => {
    if (val === undefined || val === null) return '₹0.0L';
    return `₹${(val / 100000).toFixed(1)}L`;
  };

  const formatNumberComma = (val) => {
    if (val === undefined || val === null) return '0';
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
  };

  const getBarColor = (index) => {
    const colors = [
      'bg-blue-500 dark:bg-blue-500',       // IT Hardware: Blue
      'bg-emerald-500 dark:bg-emerald-500',   // Furniture: Green
      'bg-amber-500 dark:bg-amber-500',     // Stationery: Orange/Yellow
      'bg-rose-500 dark:bg-rose-500',         // Logistics: Red
      'bg-purple-500 dark:bg-purple-500',
      'bg-indigo-500 dark:bg-indigo-500'
    ];
    return colors[index % colors.length];
  };

  const maxSpend = analytics?.spend_by_category?.length > 0 
    ? Math.max(...analytics.spend_by_category.map(c => c.value)) 
    : 1;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-[#0B0F0E] rounded-md w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-[#0B0F0E] rounded-xl border border-[#223027]"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-[#0B0F0E] rounded-xl border border-[#223027]"></div>
          <div className="h-80 bg-[#0B0F0E] rounded-xl border border-[#223027]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDEA] tracking-tight">Reports & analytics</h1>
          <p className="text-xs text-[#94A3B8] mt-1 font-medium lowercase">
            Procurement Insights- {formatMonthTitle(selectedMonth)}
          </p>
        </div>
        
        {/* Date Selector & Export Actions */}
        <div className="flex items-center gap-3">
          {/* Custom Date Pill */}
          <div className="relative flex items-center justify-center bg-[#0B0F0E] border border-[#223027] hover:border-[#22C55E]/40 px-4 py-2 rounded-xl text-xs text-[#E8EDEA] cursor-pointer transition-all min-w-[100px] text-center">
            <span className="font-semibold">{formatMonthPill(selectedMonth)}</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* Export Pill */}
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="border border-[#223027] hover:border-[#22C55E]/40 text-[#94A3B8] hover:text-[#E8EDEA] font-semibold px-5 py-2 rounded-xl text-xs cursor-pointer transition-all bg-[#0B0F0E] flex items-center gap-1.5 disabled:opacity-45"
          >
            {exporting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Spend */}
        <div className="bg-[#0B0F0E] border border-[#223027] p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-md min-h-[120px]">
          <h3 className="text-3xl font-bold text-[#3B82F6] dark:text-[#60A5FA] tracking-tight">
            {formatSpendKPI(analytics?.total_spend)}
          </h3>
          <span className="text-xs text-[#94A3B8] font-medium mt-2 lowercase">total spend</span>
        </div>

        {/* Active Vendors */}
        <div className="bg-[#0B0F0E] border border-[#223027] p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-md min-h-[120px]">
          <h3 className="text-3xl font-bold text-[#10B981] dark:text-[#34D399] tracking-tight">
            {analytics?.active_vendors}
          </h3>
          <span className="text-xs text-[#94A3B8] font-medium mt-2">Active vendors</span>
        </div>

        {/* PO Fulfillment */}
        <div className="bg-[#0B0F0E] border border-[#223027] p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-md min-h-[120px]">
          <h3 className="text-3xl font-bold text-[#F59E0B] dark:text-[#FBBF24] tracking-tight">
            {parseFloat(analytics?.po_fulfillment_pct || 100).toFixed(0)}%
          </h3>
          <span className="text-xs text-[#94A3B8] font-medium mt-2">PO Fulfillment</span>
        </div>

        {/* Overdue Invoices */}
        <div className="bg-[#0B0F0E] border border-[#223027] p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-md min-h-[120px]">
          <h3 className="text-3xl font-bold text-[#EF4444] dark:text-[#F87171] tracking-tight">
            {analytics?.overdue_invoices}
          </h3>
          <span className="text-xs text-[#94A3B8] font-medium mt-2 lowercase">overdue invoices</span>
        </div>
      </div>

      {/* Grid of charts and tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Spend by Category Column */}
        <div className="flex flex-col">
          <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-4">Spend by Category</h3>
          <div className="bg-[#0B0F0E] border border-[#223027] p-6 rounded-2xl shadow-md flex-1">
            {analytics?.spend_by_category?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#94A3B8] italic py-16">
                No categorical spend recorded for this month.
              </div>
            ) : (
              <div className="space-y-6">
                {analytics?.spend_by_category?.map((cat, idx) => {
                  const percentage = (cat.value / maxSpend) * 100;
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#E8EDEA] font-semibold">{cat.name}</span>
                        <span className="text-[#94A3B8] font-mono">{formatCategorySpend(cat.value)}</span>
                      </div>
                      {/* Custom progress bar */}
                      <div className="h-2.5 bg-[#223027]/40 rounded-full w-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(idx)}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Top Vendors & Monthly Trend */}
        <div className="space-y-8">
          
          {/* Top Vendors by Spend */}
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-4">Top Vendors by Spend</h3>
            <div className="bg-[#0B0F0E] border border-[#223027] rounded-2xl overflow-hidden shadow-md">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#0F1513] border-b border-[#223027] text-[#94A3B8]">
                    <th className="p-3.5 font-semibold uppercase tracking-wider">Vendor</th>
                    <th className="p-3.5 font-semibold uppercase tracking-wider text-right">Spend (₹)</th>
                    <th className="p-3.5 font-semibold uppercase tracking-wider text-center">POs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#223027]/40 bg-[#0B0F0E]">
                  {analytics?.top_vendors_by_spend?.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-[#94A3B8] italic">No supplier spend recorded.</td>
                    </tr>
                  ) : (
                    analytics?.top_vendors_by_spend?.map((vendor, index) => (
                      <tr key={index} className="hover:bg-[#16211d]/20 transition-colors">
                        <td className="p-3.5 text-[#E8EDEA] font-semibold">{vendor.name}</td>
                        <td className="p-3.5 text-[#E8EDEA] text-right font-medium">{formatNumberComma(vendor.spend)}</td>
                        <td className="p-3.5 text-[#E8EDEA] text-center font-mono font-medium">{vendor.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-4">Monthly Trend</h3>
            <div className="bg-[#0B0F0E] border border-[#223027] p-6 rounded-2xl shadow-md">
              <div className="w-full pt-2">
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart 
                    data={analytics?.monthly_trend || []} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis 
                      dataKey="name" 
                      stroke="#94A3B8" 
                      fontSize={10} 
                      tickLine={false} 
                      tickFormatter={(val) => val ? val.split(' ')[0] : ''}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B0F0E', borderColor: '#223027', borderRadius: '8px', color: '#E8EDEA', fontSize: '11px' }}
                      formatter={(v) => [`₹${formatNumberComma(v)}`, 'Spend']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {(analytics?.monthly_trend || []).map((entry, index) => {
                        const isCurrentMonth = index === (analytics?.monthly_trend?.length - 1);
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={isCurrentMonth ? '#1E40AF' : '#93C5FD'} 
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Reports;
