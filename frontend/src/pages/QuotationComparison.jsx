import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ArrowLeft, Star, Clock, Check, Loader2, Award, FileText } from 'lucide-react';
import api from '../lib/api';

const QuotationComparison = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer']);

  const [rfq, setRfq] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  const fetchData = async () => {
    try {
      const [rfqRes, quotesRes] = await Promise.all([
        api.get(`/rfqs/${id}`),
        api.get(`/rfqs/${id}/quotations`)
      ]);
      setRfq(rfqRes.data);
      setQuotes(quotesRes.data);
    } catch (err) {
      console.error("Failed to load comparison data:", err);
      alert("Error loading data. Redirecting...");
      navigate('/rfqs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSelectQuote = async (quoteId) => {
    if (!window.confirm("Are you sure you want to select this quotation and initiate the approval workflow?")) {
      return;
    }
    setSubmittingId(quoteId);
    try {
      await api.post(`/quotations/${quoteId}/select`);
      alert("Quotation selected! Approval workflow initiated.");
      navigate('/rfqs');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to select quotation.");
    } finally {
      setSubmittingId(null);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8C9A93]">
        <Loader2 className="h-8 w-8 animate-spin text-[#22C55E] mb-2" />
        <span>Loading quotation comparison matrix...</span>
      </div>
    );
  }

  // Find lowest price quote to highlight it
  const lowestTotal = quotes.length > 0 
    ? Math.min(...quotes.map(q => q.grand_total)) 
    : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(`/rfqs/${id}`)}
        className="flex items-center gap-2 text-xs text-[#8C9A93] hover:text-[#E8EDEA] transition-all cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to RFQ Details
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDEA]">Quotation Comparison Matrix</h1>
        <p className="text-xs text-[#8C9A93] mt-1">
          Review and compare side-by-side submissions for <span className="text-[#22C55E] font-semibold">{rfq?.rfq_number} - {rfq?.title}</span>.
        </p>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-16 bg-[#121A17] border border-[#223027] rounded-xl space-y-2">
          <p className="text-sm text-[#8C9A93]">No quotations have been submitted for this RFQ yet.</p>
          <button
            onClick={() => navigate('/rfqs')}
            className="text-xs text-[#22C55E] hover:underline"
          >
            Go back to list
          </button>
        </div>
      ) : (
        <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-xl">
          {/* Scrollable table container */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-[#0F1513] border-b border-[#223027]">
                  <th className="p-4 text-xs font-semibold text-[#8C9A93] uppercase tracking-wider min-w-[200px]">Criteria / Vendor</th>
                  {quotes.map((q) => {
                    const isLowest = q.grand_total === lowestTotal;
                    return (
                      <th 
                        key={q.id} 
                        className={`p-4 border-l border-[#223027] text-center min-w-[180px] ${
                          isLowest ? 'bg-[#14261d]' : ''
                        }`}
                      >
                        <span className="block font-bold text-sm text-[#E8EDEA]">{q.vendor_name}</span>
                        <span className="inline-block text-[9px] font-mono text-[#8C9A93] mt-0.5">{q.quotation_number}</span>
                        {isLowest && (
                          <span className="mt-1.5 flex items-center justify-center gap-1 text-[9px] text-[#22C55E] bg-[#22C55E]/10 py-0.5 px-2 rounded-full font-bold uppercase tracking-wider mx-auto w-fit">
                            <Award className="h-3 w-3" />
                            Lowest Price
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-[#223027]/50">
                {/* 1. Vendor Rating */}
                <tr>
                  <td className="p-4 font-medium text-[#8C9A93]">Vendor Rating</td>
                  {quotes.map(q => (
                    <td key={q.id} className="p-4 border-l border-[#223027]/50 text-center">
                      <div className="flex items-center justify-center gap-1 font-semibold text-amber-400">
                        <Star className="h-4 w-4 fill-amber-400" />
                        <span>{parseFloat(q.vendor_rating || 0).toFixed(1)} / 5.0</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 2. Delivery Lead Time */}
                <tr>
                  <td className="p-4 font-medium text-[#8C9A93]">Delivery Lead Time</td>
                  {quotes.map(q => (
                    <td key={q.id} className="p-4 border-l border-[#223027]/50 text-center text-[#E8EDEA]">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-4 w-4 text-[#8C9A93]" />
                        <span>{q.delivery_days} Days</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 3. Payment Terms */}
                <tr>
                  <td className="p-4 font-medium text-[#8C9A93]">Payment Terms</td>
                  {quotes.map(q => (
                    <td key={q.id} className="p-4 border-l border-[#223027]/50 text-center text-[#E8EDEA] italic max-w-xs truncate" title={q.payment_terms}>
                      {q.payment_terms || 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* 4. Line Item Prices */}
                {rfq?.line_items?.map((rfqItem, itemIdx) => (
                  <tr key={rfqItem.id}>
                    <td className="p-4">
                      <span className="font-semibold text-[#E8EDEA]">{rfqItem.item_name}</span>
                      <span className="block text-[10px] text-[#8C9A93] mt-0.5">Required Qty: {parseInt(rfqItem.quantity)}</span>
                    </td>
                    {quotes.map(q => {
                      // Find item in this quotation
                      const qItem = q.line_items?.find(qi => qi.item_name === rfqItem.item_name);
                      return (
                        <td key={q.id} className="p-4 border-l border-[#223027]/50 text-center">
                          {qItem ? (
                            <div className="space-y-0.5">
                              <span className="font-medium text-[#E8EDEA]">{formatCurrency(qItem.unit_price)} <span className="text-[10px] text-[#8C9A93]">/ unit</span></span>
                              <span className="block text-[10px] text-[#8C9A93]">Total: {formatCurrency(qItem.total)}</span>
                            </div>
                          ) : (
                            <span className="text-[#8C9A93] italic">Not Quoted</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* 5. Subtotal */}
                <tr className="bg-[#0F1513]/40">
                  <td className="p-4 font-medium text-[#8C9A93]">Subtotal</td>
                  {quotes.map(q => (
                    <td key={q.id} className="p-4 border-l border-[#223027]/50 text-center text-[#E8EDEA]">
                      {formatCurrency(q.subtotal)}
                    </td>
                  ))}
                </tr>

                {/* 6. GST / Tax */}
                <tr className="bg-[#0F1513]/40">
                  <td className="p-4 font-medium text-[#8C9A93]">GST / Tax ({quotes[0]?.tax_percent}%)</td>
                  {quotes.map(q => (
                    <td key={q.id} className="p-4 border-l border-[#223027]/50 text-center text-[#8C9A93]">
                      {formatCurrency(q.tax_amount)}
                    </td>
                  ))}
                </tr>

                {/* 7. Grand Total (Highlighted Row) */}
                <tr className="bg-[#0F1513]/80 border-t-2 border-[#223027]">
                  <td className="p-4 text-sm font-bold text-[#E8EDEA]">Grand Total</td>
                  {quotes.map(q => {
                    const isLowest = q.grand_total === lowestTotal;
                    return (
                      <td 
                        key={q.id} 
                        className={`p-4 border-l border-[#223027] text-center text-sm font-bold ${
                          isLowest ? 'text-[#22C55E] bg-[#14261d]/50' : 'text-[#E8EDEA]'
                        }`}
                      >
                        {formatCurrency(q.grand_total)}
                      </td>
                    );
                  })}
                </tr>

                {/* 8. Action selector buttons */}
                {isStaff && rfq?.status !== 'po_generated' && rfq?.status !== 'approved' && (
                  <tr>
                    <td className="p-4 font-medium text-[#8C9A93]">Selection Action</td>
                    {quotes.map(q => {
                      const isSubmitting = submittingId === q.id;
                      return (
                        <td key={q.id} className="p-4 border-l border-[#223027]/50 text-center">
                          <button
                            onClick={() => handleSelectQuote(q.id)}
                            disabled={submittingId !== null}
                            className="w-full bg-[#1a2d24] hover:bg-[#22C55E] text-[#22C55E] hover:text-black font-semibold py-2 rounded-lg text-xs cursor-pointer border border-[#22C55E]/30 hover:border-transparent transition-all flex items-center justify-center gap-1.5 disabled:opacity-45"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            <span>Select & Route</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Notes display footer */}
          <div className="bg-[#0F1513] border-t border-[#223027] p-5 text-xs text-[#8C9A93] space-y-3">
            <h4 className="font-semibold text-[#E8EDEA] uppercase text-[10px] tracking-wide">Vendor Remarks & Scope of Work:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quotes.map(q => (
                <div key={q.id} className="space-y-1.5">
                  <span className="font-semibold text-[#E8EDEA]">{q.vendor_name}:</span>
                  <p className="italic leading-relaxed">"{q.notes || 'No remarks provided.'}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationComparison;
