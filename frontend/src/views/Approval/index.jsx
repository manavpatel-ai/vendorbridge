import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utility/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  X, 
  ArrowRight, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Award,
  Building,
  UserCheck
} from 'lucide-react';
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
  const [rfqApprovals, setRfqApprovals] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPendingApprovals = async () => {
    setLoadingList(true);
    try {
      const res = await api.get('/approvals/pending');
      setPendingSteps(res.data);
      // Deselect
      setSelectedStep(null);
      setRfqDetails(null);
      setQuoteDetails(null);
      setRfqApprovals([]);
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
      const [rfqRes, quoteRes, approvalsRes] = await Promise.all([
        api.get(`/rfqs/${step.rfq_id}`),
        api.get(`/quotations/${step.quotation_id}`),
        api.get(`/approvals/rfq/${step.rfq_id}`)
      ]);
      setRfqDetails(rfqRes.data);
      setQuoteDetails(quoteRes.data);
      setRfqApprovals(approvalsRes.data);
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

  // Stepper state helper
  const getStepClass = (stepNum) => {
    if (!selectedStep) return 'bg-zinc-800 border-zinc-700 text-zinc-500';
    const currentLevel = selectedStep.level; // 1 or 2
    
    if (stepNum === 1) { // Submitted
      return 'bg-emerald-950 text-emerald-400 border-emerald-500 shadow-md shadow-emerald-500/10';
    }
    if (stepNum === 2) { // L1 Review
      if (currentLevel === 1) return 'bg-[#1a2d24] text-[#22C55E] border-[#22C55E] shadow-md';
      if (currentLevel > 1) return 'bg-emerald-950 text-emerald-400 border-emerald-500';
    }
    if (stepNum === 3) { // L2 approval
      if (currentLevel === 2) return 'bg-[#1a2d24] text-[#22C55E] border-[#22C55E] shadow-md';
    }
    return 'bg-zinc-800 border-zinc-700 text-zinc-500';
  };

  const getLineClass = (stepNum) => {
    if (!selectedStep) return 'bg-zinc-800';
    const currentLevel = selectedStep.level;
    
    if (stepNum === 1 && currentLevel >= 1) return 'bg-emerald-500';
    if (stepNum === 2 && currentLevel >= 2) return 'bg-emerald-500';
    return 'bg-zinc-800';
  };

  const getLabelClass = (stepNum) => {
    if (!selectedStep) return 'text-zinc-500';
    const currentLevel = selectedStep.level;
    
    if (stepNum === 1) return 'text-[#E8EDEA] font-semibold';
    if (stepNum === 2 && currentLevel === 1) return 'text-[#22C55E] font-semibold';
    if (stepNum === 2 && currentLevel > 1) return 'text-[#E8EDEA]';
    if (stepNum === 3 && currentLevel === 2) return 'text-[#22C55E] font-semibold';
    return 'text-zinc-500';
  };

  // Find L1 and L2 approval details from the loaded chain
  const l1Step = rfqApprovals.find(a => a.level === 1);
  const l2Step = rfqApprovals.find(a => a.level === 2);

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#E8EDEA] tracking-tight">Pending Approvals</h1>
        <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-medium">
          Review purchase requests, check vendor quotations, and grant approvals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Col: Pending Approvals list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0B0F0E] border border-[#223027] p-5 rounded-xl shadow-lg">
            <h3 className="text-xs font-semibold text-[#E8EDEA] uppercase tracking-wide border-b border-[#223027] pb-3 mb-4">Pending Tasks</h3>

            {loadingList ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#22C55E]" />
              </div>
            ) : pendingSteps.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#94A3B8] italic bg-[#0B0F0E]/40 border border-dashed border-[#223027] rounded-xl">
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
                          ? 'bg-[#1a2d24] border-[#22C55E] text-[#E8EDEA] shadow-lg shadow-[#22C55E]/5'
                          : 'bg-[#0B0F0E] border-[#223027] hover:border-[#22C55E]/30 text-[#94A3B8] hover:text-[#E8EDEA]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-xs text-[#E8EDEA]">Level {stepItem.level} Approval</span>
                        <span className="text-[10px] text-[#94A3B8] font-mono">
                          {new Date(stepItem.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-[#22C55E] mt-2">ID: {stepItem.id.substring(0, 8)}...</p>
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#223027]/40 text-[10px] text-[#94A3B8]">
                        <span>Click to review workflow</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Cols: Details & Decisions Panel */}
        <div className="lg:col-span-2">
          {!selectedStep ? (
            <div className="h-72 bg-[#0B0F0E] border border-[#223027] rounded-xl flex items-center justify-center text-xs text-[#94A3B8] italic shadow-md">
              Select a pending approval task from the list to load workflow.
            </div>
          ) : loadingDetails ? (
            <div className="h-72 bg-[#0B0F0E] border border-[#223027] rounded-xl flex flex-col items-center justify-center gap-2 text-xs text-[#94A3B8] shadow-md">
              <Loader2 className="h-6 w-6 animate-spin text-[#22C55E]" />
              <span>Fetching workflow specifications...</span>
            </div>
          ) : (
            <div className="bg-[#0B0F0E] border border-[#223027] p-8 rounded-xl shadow-lg space-y-8 animate-fade-in">
              
              {/* Workflow details title matching user's sketch */}
              <div className="border-b border-[#223027] pb-4">
                <h2 className="text-xl font-bold text-[#E8EDEA]">Approval Workflow</h2>
                <p className="text-xs text-[#94A3B8] mt-1 font-semibold capitalize">
                  RFQ: {rfqDetails?.title} - Vendor: {quoteDetails?.vendor_name} - {formatCurrency(quoteDetails?.grand_total)}
                </p>
              </div>

              {/* Stepper matching user's sketch */}
              <div className="relative flex justify-between items-center bg-[#0B0F0E]/40 border border-[#223027] px-6 py-4 rounded-xl">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 z-0 mx-16 flex">
                  <div className={`flex-1 h-full ${getLineClass(1)}`} />
                  <div className={`flex-1 h-full ${getLineClass(2)}`} />
                  <div className={`flex-1 h-full ${getLineClass(3)}`} />
                </div>
                
                {[
                  { label: 'Submitted', num: 1 },
                  { label: 'L1 Review', num: 2 },
                  { label: 'L2 approval', num: 3 },
                  { label: 'Generate PO', num: 4 }
                ].map(s => (
                  <div key={s.num} className="relative z-10 flex flex-col items-center gap-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${getStepClass(s.num)}`}>
                      {s.num === 1 || (s.num === 2 && selectedStep.level > 1) ? (
                        <Check className="h-4 w-4" />
                      ) : s.num}
                    </div>
                    <span className={`text-[10px] uppercase font-semibold mt-1 tracking-wide ${getLabelClass(s.num)}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Side-by-Side Approval chain and Quotations summary details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                
                {/* Left side: Approval Chain and remarks */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <span className="block text-xs font-bold text-[#22C55E] uppercase tracking-wider">
                      APPROVAL CHAIN
                    </span>
                    
                    <div className="space-y-4">
                      {/* Step 1: L1 reviewer details */}
                      <div className="flex gap-3 items-start text-xs">
                        <div className={`h-8 w-8 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          l1Step?.status === 'approved' 
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' 
                            : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                        }`}>
                          {l1Step?.status === 'approved' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-[#E8EDEA] block">
                            {l1Step?.approver_name || 'Rahul Verma'} (Procurement Head)
                          </span>
                          <span className={`text-[10px] block mt-1 ${
                            l1Step?.status === 'approved' ? 'text-emerald-400 font-medium' : 'text-[#94A3B8]'
                          }`}>
                            {l1Step?.status === 'approved' 
                              ? `Approved on ${new Date(l1Step.acted_at).toLocaleDateString()} at ${new Date(l1Step.acted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                              : 'Awaiting review'
                            }
                          </span>
                        </div>
                      </div>

                      {/* Step 2: L2 reviewer details */}
                      <div className="flex gap-3 items-start text-xs">
                        <div className={`h-8 w-8 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          l2Step?.status === 'approved' 
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' 
                            : selectedStep.level === 2 
                            ? 'bg-[#1a2d24] border-[#22C55E] text-[#22C55E]'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                        }`}>
                          {l2Step?.status === 'approved' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-[#E8EDEA] block">
                            {l2Step?.approver_name || 'Priya Shah'} (Finance Manager)
                          </span>
                          <span className={`text-[10px] block mt-1 ${
                            l2Step?.status === 'approved' ? 'text-emerald-400 font-medium' : 'text-[#94A3B8]'
                          }`}>
                            {l2Step?.status === 'approved'
                              ? `Approved on ${new Date(l2Step.acted_at).toLocaleDateString()} at ${new Date(l2Step.acted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                              : selectedStep.level === 2
                              ? `Awaiting - Assigned ${new Date(l2Step?.created_at || selectedStep.created_at).toLocaleDateString()}`
                              : 'Pending previous step'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Approval remarks section */}
                  {hasRole(['admin', 'manager']) && (
                    <div className="space-y-2">
                      <span className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                        Approval Remarks
                      </span>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={4}
                        className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-3 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                        placeholder="Add your comments or conditions...."
                      />
                    </div>
                  )}
                </div>

                {/* Right side: Quotation Summary Box details */}
                <div className="space-y-6">
                  <div className="bg-[#0B0F0E]/40 border border-[#223027] p-6 rounded-xl space-y-4 shadow-md">
                    <span className="block text-xs font-bold text-[#22C55E] uppercase tracking-wider">
                      QUOTATIONS SUMMARY
                    </span>
                    
                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between border-b border-[#223027]/40 pb-2">
                        <span className="text-[#94A3B8]">Vendor:</span>
                        <span className="font-semibold text-[#E8EDEA]">{quoteDetails?.vendor_name}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#223027]/40 pb-2">
                        <span className="text-[#94A3B8]">Total:</span>
                        <span className="font-bold text-[#22C55E] font-mono">{formatCurrency(quoteDetails?.grand_total)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#223027]/40 pb-2">
                        <span className="text-[#94A3B8]">Delivery:</span>
                        <span className="font-semibold text-[#E8EDEA]">{quoteDetails?.delivery_days} days</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-[#94A3B8]">Rating:</span>
                        <div className="flex items-center text-amber-400 font-bold gap-0.5">
                          <span>★ {formatRating(quoteDetails?.vendor_rating)} / 5</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  {hasRole(['admin', 'manager']) ? (
                    <div className="flex gap-4 pt-2">
                      <button
                        onClick={() => handleAction(true)}
                        disabled={processing}
                        className="flex-1 bg-[#22C55E] hover:bg-[#16a34a] text-black font-bold py-3 rounded-lg text-xs cursor-pointer shadow-lg shadow-[#22C55E]/10 hover:shadow-xl hover:shadow-[#22C55E]/20 transition-all duration-300 flex items-center justify-center gap-1.5"
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 animate-spin text-black" />
                        ) : (
                          <Check className="h-4 w-4 text-black" />
                        )}
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleAction(false)}
                        disabled={processing}
                        className="flex-1 bg-transparent border border-rose-500 hover:bg-rose-950/20 text-rose-500 font-semibold py-3 rounded-lg text-xs cursor-pointer transition-all duration-300 flex items-center justify-center gap-1.5"
                      >
                        <X className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-zinc-800 text-zinc-400 rounded-lg text-xs text-center border border-zinc-700">
                      Approval actions are restricted to Managers & Administrators.
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const formatRating = (val) => {
  return parseFloat(val || 0).toFixed(1);
};

export default Approval;
