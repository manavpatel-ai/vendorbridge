import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utility/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, X, FileText, User, ShieldAlert, Award, Clock, ArrowRight, Loader2 } from 'lucide-react';
import api from '../../utility/api';

const Approval = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  
  // Enforce role
  useEffect(() => {
    if (!hasRole(['admin', 'manager', 'procurement_officer'])) {
      navigate('/');
    }
  }, []);

  const [pendingSteps, setPendingSteps] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedStep, setSelectedStep] = useState(null);
  const [rfqDetails, setRfqDetails] = useState(null);
  const [quoteDetails, setQuoteDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPendingApprovals = async () => {
    setLoadingList(true);
    try {
      const res = await api.get('/approvals/pending');
      setPendingSteps(res.data);
      // Deselect if no longer pending
      setSelectedStep(null);
      setRfqDetails(null);
      setQuoteDetails(null);
    } catch (err) {
      console.error("Failed to load approvals:", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const handleSelectStep = async (step) => {
    setSelectedStep(step);
    setLoadingDetails(true);
    setRemarks('');
    try {
      const [rfqRes, quoteRes] = await Promise.all([
        api.get(`/rfqs/${step.rfq_id}`),
        api.get(`/quotations/${step.quotation_id}`)
      ]);
      setRfqDetails(rfqRes.data);
      setQuoteDetails(quoteRes.data);
    } catch (err) {
      console.error("Failed to load details:", err);
      alert("Failed to load details for this procurement.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAction = async (isApprove) => {
    if (!selectedStep) return;
    setProcessing(true);
    const endpoint = `/approvals/${selectedStep.id}/${isApprove ? 'approve' : 'reject'}`;
    
    try {
      await api.post(endpoint, { remarks });
      alert(`Procurement ${isApprove ? 'Approved' : 'Rejected'} successfully!`);
      fetchPendingApprovals();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to process approval step.");
    } finally {
      setProcessing(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-[#E8EDEA]">Pending Approvals</h1>
        <p className="text-xs text-[#8C9A93] mt-1">
          Review purchase requests, check vendor quotations, and grant approvals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Pending Approvals list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#121A17] border border-[#223027] p-4 rounded-xl shadow-md">
            <h3 className="text-xs font-semibold text-[#E8EDEA] uppercase tracking-wide border-b border-[#223027] pb-2 mb-3">Pending Tasks</h3>

            {loadingList ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#22C55E]" />
              </div>
            ) : pendingSteps.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8C9A93] italic">
                No pending approvals. All caught up!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSteps.map((stepItem) => {
                  const isSelected = selectedStep?.id === stepItem.id;
                  return (
                    <div
                      key={stepItem.id}
                      onClick={() => handleSelectStep(stepItem)}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1a2d24] border-[#22C55E] text-[#E8EDEA]'
                          : 'bg-[#0B0F0E] border-[#223027] hover:border-[#22C55E]/30 text-[#8C9A93] hover:text-[#E8EDEA]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-xs text-[#E8EDEA]">Level {stepItem.level} Approval</span>
                        <span className="text-[10px] text-[#8C9A93]">
                          {new Date(stepItem.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-[#22C55E] mt-2">ID: {stepItem.id.substring(0, 8)}...</p>
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#223027]/40 text-[10px] text-[#8C9A93]">
                        <span>Click to review details</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Cols: Details & Decisions */}
        <div className="lg:col-span-2">
          {!selectedStep ? (
            <div className="h-64 bg-[#121A17] border border-[#223027] rounded-xl flex items-center justify-center text-xs text-[#8C9A93] italic shadow-md">
              Select a pending approval from the list to review specifications.
            </div>
          ) : loadingDetails ? (
            <div className="h-64 bg-[#121A17] border border-[#223027] rounded-xl flex flex-col items-center justify-center gap-2 text-xs text-[#8C9A93] shadow-md">
              <Loader2 className="h-6 w-6 animate-spin text-[#22C55E]" />
              <span>Fetching procurement details...</span>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* RFQ & Quote Info Card */}
              <div className="bg-[#121A17] border border-[#223027] p-6 rounded-xl shadow-md space-y-4">
                <div className="flex justify-between items-start border-b border-[#223027] pb-4">
                  <div>
                    <span className="font-mono text-xs text-[#22C55E] font-semibold">{rfqDetails?.rfq_number}</span>
                    <h2 className="text-base font-semibold text-[#E8EDEA] mt-1">{rfqDetails?.title}</h2>
                    <p className="text-xs text-[#8C9A93] mt-1">Category: {rfqDetails?.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#8C9A93] block">Selected Vendor</span>
                    <span className="font-bold text-sm text-[#22C55E]">{quoteDetails?.vendor_name}</span>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="bg-[#0B0F0E] p-4 border border-[#223027] rounded-lg flex flex-wrap justify-between items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#8C9A93] uppercase font-semibold">Total Bid Value</span>
                    <h3 className="text-xl font-bold text-[#E8EDEA]">{formatCurrency(quoteDetails?.grand_total)}</h3>
                  </div>
                  <div className="text-right text-xs text-[#8C9A93] space-y-1">
                    <div>Subtotal: {formatCurrency(quoteDetails?.subtotal)}</div>
                    <div>Tax ({quoteDetails?.tax_percent}%): {formatCurrency(quoteDetails?.tax_amount)}</div>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-[#8C9A93] uppercase tracking-wide">Quoted Items</span>
                  <div className="border border-[#223027] rounded-lg divide-y divide-[#223027] overflow-hidden text-xs">
                    {quoteDetails?.line_items?.map((item, idx) => (
                      <div key={idx} className="p-3 bg-[#0F1513]/40 flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-[#E8EDEA]">{item.item_name}</span>
                          <span className="block text-[10px] text-[#8C9A93] mt-0.5">Quantity: {parseInt(item.quantity)}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-[#E8EDEA]">{formatCurrency(item.unit_price)}</span>
                          <span className="block text-[10px] text-[#8C9A93] mt-0.5">Total: {formatCurrency(item.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery and payment terms */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-[#0F1513]/30 p-3 rounded-lg border border-[#223027]/40">
                  <div>
                    <span className="font-semibold text-[#8C9A93] block">Lead Delivery Time</span>
                    <span className="text-[#E8EDEA] mt-1 block">{quoteDetails?.delivery_days} Days</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#8C9A93] block">Payment Terms</span>
                    <span className="text-[#E8EDEA] mt-1 block italic">{quoteDetails?.payment_terms || 'Immediate'}</span>
                  </div>
                </div>
              </div>

              {/* Remarks & Approval Actions */}
              <div className="bg-[#121A17] border border-[#223027] p-6 rounded-xl shadow-md space-y-4">
                <h3 className="text-xs font-semibold text-[#22C55E] uppercase tracking-wide">Approval Action</h3>
                
                {hasRole(['admin', 'manager']) ? (
                  <>
                    <div className="space-y-3">
                      <label className="block text-xs text-[#8C9A93]">Remarks / Approval Notes</label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={3}
                        className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-3 py-2 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                        placeholder="Provide justification notes, pricing feedback, or approval remarks..."
                      />
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button
                        onClick={() => handleAction(false)}
                        disabled={processing}
                        className="flex-1 flex items-center justify-center gap-2 border border-rose-500 hover:bg-rose-500/10 text-rose-500 font-semibold py-2.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45"
                      >
                        <X className="h-4 w-4" />
                        Reject Procurement
                      </button>

                      <button
                        onClick={() => handleAction(true)}
                        disabled={processing}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-black font-bold py-2.5 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-45"
                      >
                        <Check className="h-4 w-4 text-black" />
                        Approve Level {selectedStep.level}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-zinc-800 text-zinc-400 rounded-lg text-xs text-center border border-zinc-700">
                    Approval actions are restricted to Managers & Administrators.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Approval;
