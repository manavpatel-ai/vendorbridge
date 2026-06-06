import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  Loader2, 
  ArrowUpRight
} from 'lucide-react';
import api from '../../utility/api';

const Invoices = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const invoicesRes = await api.get('/invoices/');
      setInvoices(invoicesRes.data);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDEA]">Invoices</h1>
        <p className="text-xs text-[#8C9A93] mt-1">
          Collect, track and process invoices for approved transactions.
        </p>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead>
                  <tr className="bg-[#0F1513] border-b border-[#223027] text-[#8C9A93]">
                    <th className="p-4 font-semibold uppercase tracking-wider">Invoice Number</th>
                    <th className="p-4 font-semibold uppercase tracking-wider">Date</th>
                    <th className="p-4 font-semibold uppercase tracking-wider">Vendor</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-right">Grand Total</th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-[#223027]/40 bg-[#121A17]">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-[#8C9A93] italic">No Invoices available.</td>
                    </tr>
                  ) : (
                    invoices.map(inv => (
                      <tr
                        key={inv.id}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="hover:bg-[#16211d] cursor-pointer transition-colors"
                      >
                        <td className="p-4 font-mono text-[#22C55E] font-semibold flex items-center gap-1">
                          {inv.invoice_number}
                          <ArrowUpRight className="h-3 w-3 opacity-60" />
                        </td>
                        <td className="p-4 text-[#E8EDEA]">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                        <td className="p-4 text-[#E8EDEA] font-medium">{inv.vendor_name}</td>
                        <td className="p-4 text-right text-[#E8EDEA] font-semibold">{formatCurrency(inv.grand_total)}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            inv.status === 'paid'
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
                              : inv.status === 'overdue'
                              ? 'bg-rose-950/40 text-rose-400 border border-rose-900/60'
                              : 'bg-amber-950/40 text-amber-400 border border-amber-900/60'
                          }`}>
                            {inv.status.replace('_', ' ')}
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
      )}
    </div>
  );
};

export default Invoices;
