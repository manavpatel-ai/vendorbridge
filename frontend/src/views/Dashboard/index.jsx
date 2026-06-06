import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  FileText, 
  CheckSquare, 
  IndianRupee, 
  AlertCircle, 
  ArrowUpRight,
  TrendingUp,
  Plus,
  UserPlus,
  Receipt,
  User
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
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      name: "Active RFQ's",
      value: data?.active_rfqs || 0,
      icon: FileText,
      color: 'text-[#22C55E]',
      bg: 'bg-[#22C55E]/10',
      description: 'Procurement requests open'
    },
    {
      name: 'Pending Approvals',
      value: data?.pending_approvals || 0,
      icon: CheckSquare,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      description: 'Require authorization',
      hideForVendor: true
    },
    {
      name: "PO's this month",
      value: formatCurrency(data?.po_total_this_month || 0),
      icon: IndianRupee,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      description: 'Total approved spends'
    },
    {
      name: 'Overdue Invoices',
      value: data?.overdue_invoices || 0,
      icon: AlertCircle,
      color: data?.overdue_invoices > 0 ? 'text-rose-500' : 'text-[#94A3B8]',
      bg: data?.overdue_invoices > 0 ? 'bg-rose-500/10' : 'bg-[#121A17]',
      description: 'Unpaid past due invoices'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#E8EDEA] tracking-tight flex items-center gap-2">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-medium">
            Welcome back, <span className="text-[#E8EDEA] font-semibold">{user?.first_name} {user?.last_name || ''}</span> – Today's Overview
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          if (kpi.hideForVendor && user?.role === 'vendor') return null;
          const Icon = kpi.icon;
          return (
            <div 
              key={idx} 
              className="bg-[#121A17] border border-[#223027] p-6 rounded-xl shadow-lg hover:border-[#22C55E]/40 hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 flex items-center justify-between group relative overflow-hidden"
            >
              {/* Card Hover Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#22C55E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
              
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] font-bold text-[#94A3B8] tracking-wider uppercase block">{kpi.name}</span>
                <h3 className="text-2xl md:text-3xl font-black text-[#E8EDEA]">{kpi.value}</h3>
                <span className="text-[10px] text-[#94A3B8] block">{kpi.description}</span>
              </div>
              <div className={`p-3.5 rounded-xl ${kpi.bg} ${kpi.color} relative z-10 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="h-6.5 w-6.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Purchase Orders Table */}
        <div className="lg:col-span-2 bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-[#223027] bg-[#0F1513]/40">
              <h3 className="font-bold text-[#E8EDEA] text-sm tracking-wide">Recent Purchase Orders</h3>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">Summary of newly generated and approved POs</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead>
                  <tr className="bg-[#0F1513]/60 border-b border-[#223027] text-[#94A3B8]">
                    <th className="p-4 font-semibold uppercase tracking-wider">PO#</th>
                    <th className="p-4 font-semibold uppercase tracking-wider">Vendor</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-right">Amount</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#223027]/40">
                  {data?.recent_purchase_orders?.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-[#94A3B8] italic">No Purchase Orders available.</td>
                    </tr>
                  ) : (
                    data?.recent_purchase_orders?.slice(0, 5).map(po => (
                      <tr 
                        key={po.id}
                        onClick={() => navigate('/purchase-orders')}
                        className="hover:bg-[#16211d]/50 cursor-pointer transition-colors group"
                      >
                        <td className="p-4 font-mono text-[#22C55E] font-bold flex items-center gap-1.5">
                          {po.po_number}
                          <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </td>
                        <td className="p-4 text-[#E8EDEA] font-medium">{po.vendor_name}</td>
                        <td className="p-4 text-right text-[#E8EDEA] font-semibold">{formatCurrency(po.grand_total)}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            po.status === 'generated' || po.status === 'approved'
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}>
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
          
          <div className="p-4 border-t border-[#223027] bg-[#0F1513]/20 text-center">
            <button 
              onClick={() => navigate('/purchase-orders')}
              className="text-xs text-[#22C55E] hover:text-[#16a34a] font-semibold cursor-pointer"
            >
              View All Purchase Orders
            </button>
          </div>
        </div>

        {/* Spend Trend Chart */}
        <div className="bg-[#121A17] border border-[#223027] p-6 rounded-xl flex flex-col shadow-lg justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-[#E8EDEA] text-sm tracking-wide">
                  {user?.role === 'vendor' ? 'Billing Trend' : 'Spending Trends'}
                </h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">Spends over the last 6 months</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-[#22C55E] bg-[#22C55E]/10 px-2.5 py-1 rounded-full font-bold">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>INR</span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data?.spend_trend_6m || []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#223027" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94A3B8" 
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94A3B8" 
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
                      fontSize: '11px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                    }}
                    formatter={(v) => [formatCurrency(v), 'Spends']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#22C55E" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#spendGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* Quick Actions Panel */}
      <div className="bg-[#121A17] border border-[#223027] p-6 rounded-xl shadow-lg relative overflow-hidden">
        {/* Glow behind buttons */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#22C55E]/5 rounded-full blur-3xl" />
        
        <h3 className="font-bold text-[#E8EDEA] text-sm tracking-wide mb-4 relative z-10">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <button
            onClick={() => navigate('/rfqs/create')}
            className="flex items-center justify-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-black font-bold py-3 rounded-lg text-xs cursor-pointer shadow-lg shadow-[#22C55E]/10 hover:shadow-xl hover:shadow-[#22C55E]/20 transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            <span>Create new RFQ</span>
          </button>
          
          <button
            onClick={() => navigate('/vendors')}
            className="flex items-center justify-center gap-2 bg-[#1a2d24] text-[#22C55E] border border-[#22C55E]/20 hover:bg-[#22C55E]/10 font-bold py-3 rounded-lg text-xs cursor-pointer transition-all duration-300"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Vendor</span>
          </button>
          
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center justify-center gap-2 bg-[#16211d] border border-[#223027] hover:border-[#22C55E]/40 text-[#E8EDEA] font-bold py-3 rounded-lg text-xs cursor-pointer transition-all duration-300"
          >
            <Receipt className="h-4 w-4 text-[#94A3B8]" />
            <span>View Invoices</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
