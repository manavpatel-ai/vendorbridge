import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  FileSignature, 
  Calendar, 
  Loader2, 
  ArrowUpRight,
  FileCheck2,
  X,
  Printer,
  Download,
  Mail,
  CreditCard
} from 'lucide-react';
import api from '../../utility/api';

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer']);

  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchase-orders/');
      setPos(res.data);
    } catch (err) {
      console.error("Failed to load POs:", err);
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
    }).format(val || 0);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDEA]">Purchase Orders</h1>
        <p className="text-xs text-[#94A3B8] mt-1">
          Review and manage generated Purchase Orders for approved procurement transactions.
        </p>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PO List */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-[#0F1513] border-b border-[#223027] text-[#94A3B8]">
                      <th className="p-4 font-semibold uppercase tracking-wider">PO Number</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Date</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Vendor</th>
                      <th className="p-4 font-semibold uppercase tracking-wider text-right">Grand Total</th>
                      <th className="p-4 font-semibold uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-[#223027]/40 bg-[#121A17]">
                    {pos.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-[#94A3B8] italic">No Purchase Orders available.</td>
                      </tr>
                    ) : (
                      pos.map(po => (
                        <tr
                          key={po.id}
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                          className="hover:bg-[#16211d] cursor-pointer transition-colors"
                        >
                          <td className="p-4 font-mono text-[#22C55E] font-semibold flex items-center gap-1">
                            {po.po_number}
                            <ArrowUpRight className="h-3 w-3 opacity-60" />
                          </td>
                          <td className="p-4 text-[#E8EDEA]">{new Date(po.po_date).toLocaleDateString()}</td>
                          <td className="p-4 text-[#E8EDEA] font-medium">{po.vendor_name}</td>
                          <td className="p-4 text-right text-[#E8EDEA] font-semibold">{formatCurrency(po.grand_total)}</td>
                          <td className="p-4 text-center">
                            <span className="text-[10px] bg-[#1a2d24] text-[#22C55E] px-2 py-0.5 rounded-full font-semibold capitalize">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
