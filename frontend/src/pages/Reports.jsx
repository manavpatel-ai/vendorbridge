import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  DollarSign, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from 'recharts';
import api from '../lib/api';

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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Recharts colors
  const COLORS = ['#22C55E', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-[#121A17] rounded-md w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-[#121A17] rounded-xl border border-[#223027]"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-[#121A17] rounded-xl border border-[#223027]"></div>
          <div className="h-80 bg-[#121A17] rounded-xl border border-[#223027]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDEA]">Reports & Analytics</h1>
          <p className="text-xs text-[#8C9A93] mt-1">
            Analyze spend distributions, vendor fulfillment KPIs, and export audit sheets.
          </p>
        </div>
        
        {/* Date Selector & Export Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#121A17] border border-[#223027] px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="h-4 w-4 text-[#22C55E]" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-[#E8EDEA] focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold px-4 py-2 rounded-lg text-xs transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-45"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-black" />
            ) : (
              <Download className="h-4 w-4 text-black" />
            )}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-[#8C9A93] uppercase tracking-wider">Total Month Spend</span>
            <h3 className="text-xl font-bold text-[#E8EDEA]">{formatCurrency(analytics?.total_spend || 0)}</h3>
          </div>
          <div className="p-2.5 rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-[#8C9A93] uppercase tracking-wider">Active Vendors</span>
            <h3 className="text-xl font-bold text-[#E8EDEA]">{analytics?.active_vendors}</h3>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-[#8C9A93] uppercase tracking-wider">PO Fulfillment Pct</span>
            <h3 className="text-xl font-bold text-[#E8EDEA]">{parseFloat(analytics?.po_fulfillment_pct || 100).toFixed(1)}%</h3>
          </div>
          <div className="p-2.5 rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-[#8C9A93] uppercase tracking-wider">Overdue Invoices</span>
            <h3 className="text-xl font-bold text-[#E8EDEA]">{analytics?.overdue_invoices}</h3>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Grid of charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category distribution chart */}
        <div className="bg-[#121A17] border border-[#223027] p-6 rounded-xl shadow-md flex flex-col justify-between h-96">
          <div>
            <h3 className="font-semibold text-[#E8EDEA] text-sm tracking-wide">Category Distribution</h3>
            <p className="text-[10px] text-[#8C9A93] mt-0.5">Procurement spend split by RFQ category</p>
          </div>
          
          <div className="flex-1 w-full h-full min-h-0 pt-4">
            {analytics?.spend_by_category?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#8C9A93] italic">
                No categorical spend recorded for this month.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.spend_by_category || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {analytics?.spend_by_category?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121A17', borderColor: '#223027', borderRadius: '8px', color: '#E8EDEA', fontSize: '11px' }}
                    formatter={(v) => [formatCurrency(v), 'Spend']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    iconSize={10} 
                    iconType="circle"
                    formatter={(value) => <span className="text-[11px] text-[#8C9A93]">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top vendors chart */}
        <div className="bg-[#121A17] border border-[#223027] p-6 rounded-xl shadow-md flex flex-col justify-between h-96">
          <div>
            <h3 className="font-semibold text-[#E8EDEA] text-sm tracking-wide">Top Suppliers</h3>
            <p className="text-[10px] text-[#8C9A93] mt-0.5">Highest order volume vendors by spend</p>
          </div>

          <div className="flex-1 w-full h-full min-h-0 pt-4">
            {analytics?.top_vendors_by_spend?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#8C9A93] italic">
                No supplier spend recorded for this month.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics?.top_vendors_by_spend || []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#223027" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#8C9A93" 
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#8C9A93" 
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121A17', borderColor: '#223027', borderRadius: '8px', color: '#E8EDEA', fontSize: '11px' }}
                    formatter={(v) => [formatCurrency(v), 'Spend']}
                  />
                  <Bar dataKey="spend" fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 6 Month line trend */}
        <div className="lg:col-span-2 bg-[#121A17] border border-[#223027] p-6 rounded-xl shadow-md flex flex-col justify-between h-80">
          <div>
            <h3 className="font-semibold text-[#E8EDEA] text-sm tracking-wide">Spend Growth Trend</h3>
            <p className="text-[10px] text-[#8C9A93] mt-0.5">Rolling monthly spend analysis</p>
          </div>

          <div className="flex-1 w-full h-full min-h-0 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={analytics?.monthly_trend || []}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#223027" />
                <XAxis 
                  dataKey="name" 
                  stroke="#8C9A93" 
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#8C9A93" 
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121A17', borderColor: '#223027', borderRadius: '8px', color: '#E8EDEA', fontSize: '11px' }}
                  formatter={(v) => [formatCurrency(v), 'Spend']}
                />
                <Line type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={2} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Reports;
