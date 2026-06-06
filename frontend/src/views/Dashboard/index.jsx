import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  FileText, 
  CheckSquare, 
  IndianRupee, 
  AlertCircle, 
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import api from '../../utility/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        setData(res.data);
      } catch (err) {
        console.error("Error fetching dashboard summary:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-[#121A17] rounded-md w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-[#121A17] rounded-xl border border-[#223027]"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-[#121A17] rounded-xl border border-[#223027]"></div>
          <div className="h-96 bg-[#121A17] rounded-xl border border-[#223027]"></div>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      name: 'Active RFQs',
      value: data?.active_rfqs || 0,
      icon: FileText,
      color: 'text-[#22C55E]',
      bg: 'bg-[#22C55E]/10'
    },
    {
      name: 'Pending Approvals',
      value: data?.pending_approvals || 0,
      icon: CheckSquare,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      hideForVendor: true
    },
    {
      name: 'Monthly Spend POs',
      value: formatCurrency(data?.po_total_this_month || 0),
      icon: IndianRupee,
      color: 'text-[#22C55E]',
      bg: 'bg-[#22C55E]/10'
    },
    {
      name: 'Overdue Invoices',
      value: data?.overdue_invoices || 0,
      icon: AlertCircle,
      color: data?.overdue_invoices > 0 ? 'text-rose-500' : 'text-[#8C9A93]',
      bg: data?.overdue_invoices > 0 ? 'bg-rose-500/10' : 'bg-[#121A17]'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDEA]">
          Welcome Back, {user?.first_name}
        </h1>
        <p className="text-xs text-[#8C9A93] mt-1">
          Here is a summary of your organization's active procurements.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          if (kpi.hideForVendor && user?.role === 'vendor') return null;
          const Icon = kpi.icon;
          return (
            <div 
              key={idx} 
              className="bg-[#121A17] border border-[#223027] p-6 rounded-xl shadow-md hover:border-[#22C55E]/40 hover:scale-[1.01] transition-all duration-200 flex items-center justify-between"
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#8C9A93] tracking-wide uppercase">{kpi.name}</span>
                <h3 className="text-2xl font-bold text-[#E8EDEA]">{kpi.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${kpi.bg} ${kpi.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts / Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Spend Chart */}
        <div className="lg:col-span-2 bg-[#121A17] border border-[#223027] p-6 rounded-xl flex flex-col shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-[#E8EDEA] text-sm tracking-wide">
                {user?.role === 'vendor' ? 'Billing Trend' : 'Spend Analytics'}
              </h3>
              <p className="text-[11px] text-[#8C9A93] mt-0.5">PO value trends over the last 6 months</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#22C55E] bg-[#22C55E]/10 px-2 py-1 rounded-full font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>INR</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.spend_trend_6m || []}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                  contentStyle={{ 
                    backgroundColor: '#121A17', 
                    borderColor: '#223027', 
                    borderRadius: '8px',
                    color: '#E8EDEA',
                    fontSize: '11px'
                  }}
                  formatter={(v) => [formatCurrency(v), 'Value']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#22C55E" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#spendGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent PO Activity Panel */}
        <div className="bg-[#121A17] border border-[#223027] p-6 rounded-xl flex flex-col shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-[#E8EDEA] text-sm tracking-wide">Recent Documents</h3>
              <p className="text-[11px] text-[#8C9A93] mt-0.5">Latest Purchase Orders generated</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            {data?.recent_purchase_orders?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#8C9A93]">
                No PO records found.
              </div>
            ) : (
              data?.recent_purchase_orders?.map((po) => (
                <div 
                  key={po.id} 
                  className="p-3 rounded-lg bg-[#0F1513] border border-[#223027] flex items-center justify-between hover:border-[#22C55E]/30 transition-all cursor-pointer"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-xs text-[#22C55E] font-semibold flex items-center gap-1">
                      {po.po_number}
                      <ArrowUpRight className="h-3 w-3 opacity-60" />
                    </span>
                    <span className="text-[11px] text-[#E8EDEA] block truncate max-w-[140px]">
                      {po.vendor_name}
                    </span>
                    <span className="text-[10px] text-[#8C9A93] block">
                      {po.po_date}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-[#E8EDEA] block">
                      {formatCurrency(po.grand_total)}
                    </span>
                    <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium mt-1 ${
                      po.status === 'generated' || po.status === 'approved'
                        ? 'bg-[#1a2d24] text-[#22C55E]'
                        : 'bg-[#223027] text-[#8C9A93]'
                    }`}>
                      {po.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
