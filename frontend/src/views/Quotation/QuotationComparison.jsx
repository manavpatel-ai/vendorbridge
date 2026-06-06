import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { ArrowLeft, Loader2, Award } from 'lucide-react';
import api from '../../utility/api';

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

  const formatRating = (val) => {
    return parseFloat(val || 0).toFixed(1);
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
    <div className="space-y-8 w-full max-w-[95%] lg:max-w-[90%] xl:max-w-[85%] mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(`/rfqs/${id}`)}
        className="flex items-center gap-2 text-xs text-[#8C9A93] hover:text-[#E8EDEA] transition-all cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to RFQ Details
      </button>

      {/* Header matching user sketch */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#E8EDEA] tracking-tight">Quotation Comparison</h1>
        <p className="text-xs sm:text-sm text-[#8C9A93] mt-1 font-semibold capitalize">
          RFQ: {rfq?.title || 'procurement'} - {quotes.length} quotations received
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
        <div className="space-y-6 animate-fade-in">
          {/* Comparison Matrix Box */}
          <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead>
                  <tr className="bg-[#0F1513] border-b border-[#223027]">
                    <th className="p-4 text-xs font-semibold text-[#8C9A93] uppercase tracking-wider min-w-[150px]">
                      Criteria
                    </th>
                    {quotes.map((q) => {
                      const isLowest = q.grand_total === lowestTotal;
                      return (
                        <th 
                          key={q.id} 
                          className={`p-4 border-l border-[#223027] text-center min-w-[180px] transition-all duration-200 ${
                            isLowest 
                              ? 'bg-emerald-950/20 text-[#22C55E] border-x border-[#22C55E]/20' 
                              : 'text-[#E8EDEA]'
                          }`}
                        >
                          <span className="block font-bold text-sm">
                            {q.vendor_name} {isLowest && '(Lowest)'}
                          </span>
                          <span className="inline-block text-[9px] font-mono text-[#8C9A93] mt-0.5">
                            {q.quotation_number}
                          </span>
                          {isLowest && (
                            <span className="mt-1.5 flex items-center justify-center gap-1 text-[9px] text-[#22C55E] bg-[#22C55E]/10 py-0.5 px-2 rounded-full font-bold uppercase tracking-wider mx-auto w-fit">
                              <Award className="h-3 w-3" />
                              Best Value
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#223027]/45">
                  {/* Row 1: Grand Total */}
                  <tr className="bg-[#0F1513]/20">
                    <td className="p-4 font-bold text-[#E8EDEA]">Grand Total</td>
                    {quotes.map((q) => {
                      const isLowest = q.grand_total === lowestTotal;
                      return (
                        <td 
                          key={q.id} 
                          className={`p-4 border-l border-[#223027]/50 text-center font-black text-sm transition-all duration-200 ${
                            isLowest ? 'bg-emerald-950/30 text-[#22C55E] border-x border-[#22C55E]/30' : 'text-[#E8EDEA]'
                          }`}
                        >
                          {formatCurrency(q.grand_total)}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 2: GST % */}
                  <tr>
                    <td className="p-4 font-medium text-[#8C9A93]">GST %</td>
                    {quotes.map((q) => {
                      const isLowest = q.grand_total === lowestTotal;
                      return (
                        <td 
                          key={q.id} 
                          className={`p-4 border-l border-[#223027]/50 text-center text-[#E8EDEA] font-mono ${
                            isLowest ? 'bg-emerald-950/10 border-x border-[#22C55E]/10' : ''
                          }`}
                        >
                          {q.tax_percent}%
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 3: Delivery (days) */}
                  <tr>
                    <td className="p-4 font-medium text-[#8C9A93]">Delivery (days)</td>
                    {quotes.map((q) => {
                      const isLowest = q.grand_total === lowestTotal;
                      return (
                        <td 
                          key={q.id} 
                          className={`p-4 border-l border-[#223027]/50 text-center text-[#E8EDEA] font-semibold ${
                            isLowest ? 'bg-emerald-950/10 border-x border-[#22C55E]/10' : ''
                          }`}
                        >
                          {q.delivery_days} days
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 4: Vendor rating */}
                  <tr>
                    <td className="p-4 font-medium text-[#8C9A93]">Vendor rating</td>
                    {quotes.map((q) => {
                      const isLowest = q.grand_total === lowestTotal;
                      return (
                        <td 
                          key={q.id} 
                          className={`p-4 border-l border-[#223027]/50 text-center ${
                            isLowest ? 'bg-emerald-950/10 border-x border-[#22C55E]/10' : ''
                          }`}
                        >
                          <span className="text-amber-400 font-semibold">{formatRating(q.vendor_rating)} / 5</span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 5: Payment terms */}
                  <tr>
                    <td className="p-4 font-medium text-[#8C9A93]">Payment terms</td>
                    {quotes.map((q) => {
                      const isLowest = q.grand_total === lowestTotal;
                      return (
                        <td 
                          key={q.id} 
                          className={`p-4 border-l border-[#223027]/50 text-center text-[#E8EDEA] italic ${
                            isLowest ? 'bg-emerald-950/10 border-x border-[#22C55E]/10' : ''
                          }`}
                        >
                          {q.payment_terms || 'Immediate'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 6: Selection Actions Row */}
                  {isStaff && rfq?.status !== 'po_generated' && rfq?.status !== 'approved' && (
                    <tr className="bg-[#0F1513]/10">
                      <td className="p-4 font-bold text-[#E8EDEA]">Selection Action</td>
                      {quotes.map((q) => {
                        const isLowest = q.grand_total === lowestTotal;
                        const isSubmitting = submittingId === q.id;
                        return (
                          <td 
                            key={q.id} 
                            className={`p-4 border-l border-[#223027]/50 text-center ${
                              isLowest ? 'bg-emerald-950/20 border-x border-[#22C55E]/20' : ''
                            }`}
                          >
                            <button
                              onClick={() => handleSelectQuote(q.id)}
                              disabled={submittingId !== null}
                              className={`w-full py-2 px-4 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer shadow-md ${
                                isLowest 
                                  ? 'bg-[#22C55E] hover:bg-[#16a34a] text-black shadow-[#22C55E]/10' 
                                  : 'bg-[#16211d] border border-[#223027] hover:border-[#22C55E]/40 text-[#E8EDEA]'
                              }`}
                            >
                              {isSubmitting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto text-current" />
                              ) : (
                                <span>{isLowest ? 'Select & Approve' : 'Select'}</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sketch notice box */}
          <div className="p-3 bg-[#16211d]/50 border border-[#223027] rounded-lg text-xs text-[#8C9A93] flex items-center gap-2 animate-fade-in w-fit">
            <div className="h-2 w-2 rounded-full bg-[#22C55E]" />
            <span>Green = lowest price, selecting vendor initiates the approval workflow.</span>
          </div>

          {/* Detailed Item-wise Comparison Table */}
          <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-lg mt-8">
            <div className="p-4 border-b border-[#223027] bg-[#0F1513]/40">
              <h3 className="text-xs font-semibold text-[#E8EDEA] uppercase tracking-wide">Detailed Item-wise Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead>
                  <tr className="bg-[#0F1513]/60 border-b border-[#223027] text-[#8C9A93]">
                    <th className="p-4 font-semibold uppercase tracking-wider">Item Details</th>
                    {quotes.map(q => (
                      <th key={q.id} className="p-4 border-l border-[#223027] text-center font-bold text-[#E8EDEA]">
                        {q.vendor_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#223027]/40 bg-[#121A17]">
                  {rfq?.line_items?.map((rfqItem) => (
                    <tr key={rfqItem.id} className="hover:bg-[#16211d]/20 transition-colors">
                      <td className="p-4">
                        <span className="font-semibold text-[#E8EDEA]">{rfqItem.item_name}</span>
                        <span className="block text-[10px] text-[#8C9A93] mt-0.5">Required Quantity: {parseInt(rfqItem.quantity)} {rfqItem.unit || 'pcs'}</span>
                      </td>
                      {quotes.map(q => {
                        const qItem = q.line_items?.find(qi => qi.item_name === rfqItem.item_name);
                        return (
                          <td key={q.id} className="p-4 border-l border-[#223027]/50 text-center font-mono">
                            {qItem ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-[#E8EDEA]">{formatCurrency(qItem.unit_price)} <span className="text-[9px] text-[#8C9A93] font-normal">/ unit</span></span>
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationComparison;
