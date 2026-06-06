import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { ArrowLeft, Loader2, IndianRupee, FileText, CheckCircle } from 'lucide-react';
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
  const [paymentTerms, setPaymentTerms] = useState('30 days net from invoice date');
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
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;
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

  return (
    <div className="space-y-8 w-full max-w-[95%] lg:max-w-[85%] xl:max-w-[80%] mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(`/rfqs/${rfqId}`)}
        className="flex items-center gap-2 text-xs text-[#8C9A93] hover:text-[#E8EDEA] transition-all cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to RFQ specifications
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDEA]">Quotation Submission Workspace</h1>
        <p className="text-xs text-[#8C9A93] mt-1">
          Review specifications and submit pricing for <span className="text-[#22C55E] font-semibold">{rfq?.rfq_number}</span>.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-400 text-xs text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form & Line Items input */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#223027] bg-[#0F1513]">
              <h3 className="text-xs font-semibold text-[#E8EDEA] uppercase tracking-wide">Enter Item Quotations</h3>
            </div>
            
            <div className="divide-y divide-[#223027] bg-[#121A17]">
              {lineItems.map((item, idx) => (
                <div key={idx} className="p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#E8EDEA] text-xs">{item.item_name}</span>
                    <span className="text-[11px] text-[#8C9A93]">Quantity: {parseInt(item.quantity)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#8C9A93] mb-1.5 uppercase">Unit Price (INR)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-[11px] text-[#8C9A93]">₹</span>
                        <input
                          type="number"
                          value={item.unit_price || ''}
                          onChange={(e) => handlePriceChange(idx, e.target.value)}
                          className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg pl-7 pr-3 py-1.5 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                          placeholder="e.g. 55000"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#8C9A93] mb-1.5 uppercase">Lead Delivery (Days)</label>
                      <input
                        type="number"
                        value={item.delivery_days || ''}
                        onChange={(e) => handleDeliveryChange(idx, e.target.value)}
                        className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-3 py-1.5 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E] text-center"
                        placeholder="e.g. 7"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terms and notes */}
          <div className="bg-[#121A17] border border-[#223027] p-6 rounded-xl space-y-4 shadow-md">
            <h3 className="text-xs font-semibold text-[#22C55E] uppercase tracking-wide">Fulfillment Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase">GST/Tax Rate (%)</label>
                <select
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(parseInt(e.target.value))}
                  className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-3 py-2 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                >
                  <option value={18}>18% (Standard GST)</option>
                  <option value={12}>12% (Reduced Tax)</option>
                  <option value={5}>5% (Essential Goods)</option>
                  <option value={28}>28% (Luxury Tax)</option>
                  <option value={0}>0% (Tax Exempted)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase">Payment Terms</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-3 py-2 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                  placeholder="e.g. Net 30"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase">Additional Notes / Warranty</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-3 py-2 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                  placeholder="Mention warranty clauses, support details, or specific logistics remarks..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#121A17] border border-[#223027] p-6 rounded-xl space-y-5 shadow-md flex flex-col justify-between">
            <h3 className="text-xs font-semibold text-[#E8EDEA] uppercase tracking-wide border-b border-[#223027] pb-3">Quotation Summary</h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8C9A93]">Subtotal</span>
                <span className="text-[#E8EDEA] font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C9A93]">CGST ({(taxPercent/2).toFixed(1)}%)</span>
                <span className="text-[#E8EDEA] font-medium">{formatCurrency(cgst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C9A93]">SGST ({(taxPercent/2).toFixed(1)}%)</span>
                <span className="text-[#E8EDEA] font-medium">{formatCurrency(sgst)}</span>
              </div>
              <div className="border-t border-[#223027] pt-3 flex justify-between text-sm">
                <span className="font-semibold text-[#22C55E]">Grand Total</span>
                <span className="font-bold text-[#E8EDEA]">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-[#223027] mt-3">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting || subtotal <= 0}
                className="w-full border border-[#223027] hover:border-[#22C55E]/40 text-[#8C9A93] hover:text-[#E8EDEA] font-semibold py-2 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45"
              >
                Save as Draft
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={submitting || subtotal <= 0}
                className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-black font-bold py-2.5 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-45"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-black" />
                )}
                <span>Submit Quotation</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QuotationSubmit;
