import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { ArrowLeft, Loader2, Info } from 'lucide-react';
import api from '../../utility/api';

const QuotationSubmit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get RFQ ID from query parameter
  const searchParams = new URLSearchParams(location.search);
  const rfqId = searchParams.get('rfq');

  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Quotation states
  const [taxPercent, setTaxPercent] = useState(18);
  const [paymentTerms, setPaymentTerms] = useState('20 days net from invoice date');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    if (!rfqId) {
      alert("No RFQ ID specified.");
      navigate('/rfqs');
      return;
    }

    const fetchRfqDetails = async () => {
      try {
        const res = await api.get(`/rfqs/${rfqId}`);
        setRfq(res.data);
        
        // Initialize line items with unit prices and individual delivery timelines
        const items = res.data.line_items.map(item => ({
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: 0,
          delivery_days: 7
        }));
        setLineItems(items);
      } catch (err) {
        console.error(err);
        alert("Failed to load RFQ specifications.");
        navigate('/rfqs');
      } finally {
        setLoading(false);
      }
    };

    fetchRfqDetails();
  }, [rfqId]);

  const handlePriceChange = (index, value) => {
    const updated = lineItems.map((item, idx) => {
      if (idx === index) {
        return { ...item, unit_price: parseFloat(value) || 0 };
      }
      return item;
    });
    setLineItems(updated);
  };

  const handleDeliveryChange = (index, value) => {
    const updated = lineItems.map((item, idx) => {
      if (idx === index) {
        return { ...item, delivery_days: parseInt(value) || 0 };
      }
      return item;
    });
    setLineItems(updated);
  };

  // Dynamically calculate values on frontend for visualization
  const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const taxAmount = subtotal * (taxPercent / 100);
  const grandTotal = subtotal + taxAmount;

  const handleSubmit = async (submitImmediate) => {
    setError('');
    
    // Simple price check
    for (let item of lineItems) {
      if (item.unit_price <= 0) {
        setError("All items must have a unit price greater than 0.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        rfq_id: rfqId,
        line_items: lineItems,
        tax_percent: parseFloat(taxPercent),
        payment_terms: paymentTerms,
        notes: notes,
        submit: submitImmediate
      };

      await api.post('/quotations/', payload);
      navigate('/rfqs');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to submit quotation. Please check inputs.");
    } finally {
      setSubmitting(false);
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
        <span>Loading RFQ details...</span>
      </div>
    );
  }

  // Generate RFQ Summary string dynamically
  const rfqSummaryStr = rfq?.line_items
    ?.map(item => `${item.item_name} * ${parseInt(item.quantity)}`)
    .join(', ') + ` - category ${rfq?.category || 'general'}`;

  return (
    <div className="space-y-8 w-full">
      {/* Back button */}
      <button
        onClick={() => navigate(`/rfqs/${rfqId}`)}
        className="flex items-center gap-2 text-xs text-[#8C9A93] hover:text-[#E8EDEA] transition-all cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to RFQ specifications
      </button>

      {/* Title block matching user's sketch */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#E8EDEA] tracking-tight">Submit Quotations</h1>
        <p className="text-xs sm:text-sm text-[#8C9A93] mt-1 font-semibold capitalize">
          RFQ: {rfq?.title || 'procurement'} - deadline {rfq?.deadline ? new Date(rfq.deadline).toLocaleDateString() : 'N/A'}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-400 text-xs text-center">
          {error}
        </div>
      )}

      {/* RFQ Summary Box from sketch */}
      <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl flex gap-3 items-start shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#22C55E]" />
        <Info className="h-5 w-5 text-[#22C55E] flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-[10px] font-bold text-[#8C9A93] uppercase tracking-wider block">RFQ Summary</span>
          <span className="text-xs text-[#E8EDEA] mt-1 block font-medium capitalize">
            {rfqSummaryStr}
          </span>
        </div>
      </div>

      {/* Quotation Table Section */}
      <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-[#223027] bg-[#0F1513]/40">
          <h3 className="text-xs font-semibold text-[#E8EDEA] uppercase tracking-wide">Your Quotation</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-[#0F1513]/60 border-b border-[#223027] text-[#8C9A93]">
                <th className="p-4 font-semibold uppercase tracking-wider">Item</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-center w-24">Qty</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-center w-36">Unit price</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-right w-36">Total</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-center w-36">Delivery (days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#223027]/40 bg-[#121A17]">
              {lineItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#16211d]/20 transition-colors">
                  {/* Item name */}
                  <td className="p-4 font-semibold text-[#E8EDEA]">
                    {item.item_name}
                  </td>
                  
                  {/* Quantity */}
                  <td className="p-4 text-center text-[#8C9A93] font-mono">
                    {parseInt(item.quantity)}
                  </td>
                  
                  {/* Unit Price Input */}
                  <td className="p-4">
                    <div className="relative max-w-[130px] mx-auto">
                      <span className="absolute left-3 top-2.5 text-[11px] text-[#8C9A93]">₹</span>
                      <input
                        type="number"
                        value={item.unit_price || ''}
                        onChange={(e) => handlePriceChange(idx, e.target.value)}
                        className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg pl-7 pr-3 py-2 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                        placeholder="e.g. 3500"
                        required
                      />
                    </div>
                  </td>
                  
                  {/* Total calculation */}
                  <td className="p-4 text-right text-[#E8EDEA] font-semibold font-mono">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </td>
                  
                  {/* Lead Delivery Input */}
                  <td className="p-4">
                    <input
                      type="number"
                      value={item.delivery_days || ''}
                      onChange={(e) => handleDeliveryChange(idx, e.target.value)}
                      className="w-full max-w-[100px] bg-[#0B0F0E] border border-[#223027] rounded-lg px-3 py-2 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E] text-center mx-auto block"
                      placeholder="e.g. 7"
                      required
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom side-by-side layout separated by horizontal line */}
      <div className="border-t border-[#223027]/60 pt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Tax Rate and Note/Terms */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">tax / GST %</label>
            <select
              value={taxPercent}
              onChange={(e) => setTaxPercent(parseInt(e.target.value))}
              className="w-full max-w-xs bg-[#121A17] border border-[#223027] rounded-lg px-3 py-2 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
            >
              <option value={18}>18% (Standard GST)</option>
              <option value={12}>12% (Reduced Tax)</option>
              <option value={5}>5% (Essential Goods)</option>
              <option value={28}>28% (Luxury Tax)</option>
              <option value={0}>0% (Tax Exempted)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Note / terms</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full bg-[#121A17] border border-[#223027] rounded-lg px-4 py-3 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
              placeholder="e.g. Payment terms: 20 days net from invoice date..."
            />
          </div>
        </div>

        {/* Right Side: Financial Summary Box */}
        <div className="bg-[#121A17] border border-[#223027] p-6 rounded-xl space-y-4 shadow-lg">
          <div className="space-y-3 text-xs font-medium">
            <div className="flex justify-between">
              <span className="text-[#8C9A93]">Subtotal</span>
              <span className="text-[#E8EDEA] font-mono">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8C9A93]">GST ({taxPercent}%)</span>
              <span className="text-[#E8EDEA] font-mono">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="border-t border-[#223027] pt-3 flex justify-between text-sm font-bold">
              <span className="text-[#22C55E]">Grand total</span>
              <span className="text-[#E8EDEA] font-mono">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Submission Buttons at the very bottom */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={submitting || subtotal <= 0}
          className="bg-[#22C55E] hover:bg-[#16a34a] text-black font-bold px-6 py-3 rounded-lg text-xs cursor-pointer transition-all shadow-lg shadow-[#22C55E]/10 disabled:opacity-45"
        >
          Submit Quotation
        </button>

        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={submitting || subtotal <= 0}
          className="bg-[#16211d] border border-[#223027] hover:border-[#22C55E]/40 text-[#E8EDEA] font-semibold px-6 py-3 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45"
        >
          Save Draft
        </button>
      </div>
    </div>
  );
};

export default QuotationSubmit;
