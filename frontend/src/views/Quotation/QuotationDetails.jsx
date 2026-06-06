import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Building,
  Clock,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import api from '../../utility/api';

const QuotationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer', 'manager']);

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/quotations/${id}`);
      setQuotation(res.data);
    } catch (err) {
      console.error('Failed to load quotation details:', err);
      setQuotation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val || 0);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        <span className="text-sm text-[#94A3B8]">Loading quotation details...</span>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/quotations')}
          className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#E8EDEA] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Quotations</span>
        </button>
        <div className="bg-[#0B0F0E] border border-[#223027] rounded-xl p-8 text-center text-[#94A3B8]">
          Quotation not found or could not be loaded.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/quotations')}
        className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#E8EDEA] transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Quotations</span>
      </button>

      <div className="bg-[#0B0F0E] border border-[#223027] rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 md:p-8 border-b border-[#223027] bg-[#0F1513] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-[#1B3D2B] border border-[#22C55E] flex items-center justify-center text-lg font-bold text-[#22C55E]">
                Q
              </div>
              <div>
                <p className="text-xs text-[#94A3B8] uppercase tracking-[0.22em] font-semibold">Quotation Profile</p>
                <h1 className="text-2xl font-extrabold text-[#E8EDEA] tracking-tight">{quotation.quotation_number}</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center text-xs text-[#94A3B8]">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getStatusStyle(quotation.status)}`}>
                {quotation.status}
              </span>
              {quotation.submitted_at && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(quotation.submitted_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#94A3B8]">Quoted Total</p>
            <p className="text-lg font-bold text-[#E8EDEA] mt-1">{formatCurrency(quotation.grand_total)}</p>
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
          <div className="space-y-5">
            <div className="bg-[#0F1513]/40 border border-[#223027] rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-[#22C55E] font-semibold uppercase text-[10px] tracking-[0.22em]">
                  <Building className="h-4 w-4" />
                  Supplier Details
                </div>
              </div>
              <div className="space-y-3 text-sm text-[#E8EDEA]">
                <div>
                  <span className="block text-[10px] text-[#94A3B8] uppercase tracking-[0.18em]">Vendor Name</span>
                  <p className="font-semibold mt-1">{quotation.vendor_name || 'System Vendor'}</p>
                </div>
                {quotation.vendor_rating !== undefined && (
                  <div className="text-amber-400 text-[11px] font-semibold">
                    ★ {quotation.vendor_rating.toFixed(1)} / 5.0
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#0F1513]/40 border border-[#223027] rounded-2xl p-5">
              <div className="flex items-center gap-2 text-[#22C55E] font-semibold uppercase text-[10px] tracking-[0.22em] mb-4">
                <Clock className="h-4 w-4" />
                Fulfillment & Payment
              </div>
              <div className="grid gap-4 text-sm text-[#E8EDEA]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-[#94A3B8] uppercase">Lead time</span>
                    <p className="font-semibold mt-1">{quotation.delivery_days ? `${quotation.delivery_days} Days` : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#94A3B8] uppercase">GST / Tax Applied</span>
                    <p className="font-semibold mt-1">{quotation.tax_percent}%</p>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-[#94A3B8] uppercase">Payment terms</span>
                  <p className="mt-1 font-medium italic text-[#E8EDEA]">"{quotation.payment_terms || 'Not Specified'}"</p>
                </div>
                {quotation.notes && (
                  <div>
                    <span className="block text-[10px] text-[#94A3B8] uppercase">Additional notes</span>
                    <p className="mt-1 text-[#E8EDEA]">{quotation.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#0F1513]/40 border border-[#223027] rounded-2xl p-5 md:p-6">
            <div className="flex items-center gap-2 text-[#22C55E] font-semibold uppercase text-[10px] tracking-[0.22em] mb-4">
              <FileText className="h-4 w-4" />
              Quoted Line Items
            </div>
            <div className="space-y-3">
              {quotation.line_items?.length ? (
                quotation.line_items.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-[#223027] bg-[#0B0F0E]/60 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#E8EDEA]">{item.item_name}</p>
                        <p className="text-[11px] text-[#94A3B8] mt-1">
                          Quantity: {item.quantity}
                          {item.delivery_days ? ` · Delivery: ${item.delivery_days} Days` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#E8EDEA] font-semibold">{formatCurrency(item.unit_price)}</p>
                        <p className="text-[11px] text-[#94A3B8] mt-1">Total: {formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#94A3B8]">No line items are available for this quotation.</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#0B0F0E] border-t border-[#223027] p-6 md:p-8">
          <div className="grid gap-4 sm:grid-cols-2 text-sm text-[#94A3B8]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-[#E8EDEA] font-mono">{formatCurrency(quotation.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST / Tax ({quotation.tax_percent}%)</span>
              <span className="text-[#E8EDEA] font-mono">{formatCurrency(quotation.tax_amount)}</span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#0B0F0E] border border-[#223027] p-4 text-sm font-semibold text-[#22C55E]">
            <span>Quotation Grand Total</span>
            <span className="text-[#E8EDEA] font-mono text-base">{formatCurrency(quotation.grand_total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationDetails;
