import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { ArrowLeft, Plus, Trash2, ShieldCheck, Check, Loader2 } from 'lucide-react';
import api from '../../utility/api';

const RFQCreate = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  // Enforce staff roles
  useEffect(() => {
    if (!hasRole(['admin', 'procurement_officer'])) {
      navigate('/rfqs');
    }
  }, []);

  const [step, setStep] = useState(1);
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    category: 'IT Hardware',
    deadline: '',
    description: ''
  });

  const [lineItems, setLineItems] = useState([
    { item_name: '', quantity: 1, unit: 'Nos' }
  ]);

  const [selectedVendors, setSelectedVendors] = useState([]);
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Fetch active vendors for step 3
  useEffect(() => {
    const fetchActiveVendors = async () => {
      setLoadingVendors(true);
      try {
        const res = await api.get('/vendors/', { params: { status: 'active' } });
        setVendors(res.data.vendors);
      } catch (err) {
        console.error("Failed to load active vendors:", err);
      } finally {
        setLoadingVendors(false);
      }
    };
    
    if (step === 3) {
      fetchActiveVendors();
    }
  }, [step]);

  // Step navigation validation
  const validateStep1 = () => {
    if (!basicInfo.title.trim()) return "RFQ Title is required";
    if (!basicInfo.deadline) return "Submission Deadline is required";
    
    const deadlineDate = new Date(basicInfo.deadline);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (deadlineDate < today) return "Deadline cannot be in the past";
    
    return "";
  };

  const validateStep2 = () => {
    for (let i = 0; i < lineItems.length; i++) {
      if (!lineItems[i].item_name.trim()) {
        return `Item #${i + 1} Name cannot be empty`;
      }
      if (lineItems[i].quantity <= 0) {
        return `Item #${i + 1} Quantity must be greater than 0`;
      }
    }
    return "";
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(prev => Math.max(1, prev - 1));
  };

  // Line item handlers
  const handleAddItem = () => {
    setLineItems([...lineItems, { item_name: '', quantity: 1, unit: 'Nos' }]);
  };

  const handleRemoveItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = lineItems.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: field === 'quantity' ? parseFloat(value) || 0 : value };
      }
      return item;
    });
    setLineItems(updated);
  };

  // Vendor selection handler
  const handleToggleVendor = (vendorId) => {
    if (selectedVendors.includes(vendorId)) {
      setSelectedVendors(selectedVendors.filter(id => id !== vendorId));
    } else {
      setSelectedVendors([...selectedVendors, vendorId]);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (selectedVendors.length === 0) {
      setError("Please select at least one vendor to invite.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: basicInfo.title,
        category: basicInfo.category,
        description: basicInfo.description || null,
        deadline: basicInfo.deadline,
        line_items: lineItems,
        vendor_ids: selectedVendors,
        publish: publishImmediately
      };

      await api.post('/rfqs/', payload);
      navigate('/rfqs');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to create RFQ. Please check fields.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-[95%] lg:max-w-[85%] xl:max-w-[75%] mx-auto">
      {/* Back to list */}
      <button
        onClick={() => navigate('/rfqs')}
        className="flex items-center gap-2 text-xs text-[#8C9A93] hover:text-[#E8EDEA] transition-all cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to RFQ List
      </button>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDEA]">Create New RFQ</h1>
        <p className="text-xs text-[#8C9A93] mt-1">
          Draft specifications, add required item quantities, and assign vendors.
        </p>
      </div>

      {/* Stepper Header */}
      <div className="relative flex justify-between items-center bg-[#121A17] border border-[#223027] px-8 py-4 rounded-xl">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#223027] -translate-y-1/2 z-0 mx-16"></div>
        
        {[
          { label: 'Basic Info', num: 1 },
          { label: 'Line Items', num: 2 },
          { label: 'Assign & Publish', num: 3 }
        ].map(s => (
          <div key={s.num} className="relative z-10 flex flex-col items-center gap-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs border transition-all ${
              step >= s.num 
                ? 'bg-[#1a2d24] text-[#22C55E] border-[#22C55E]' 
                : 'bg-[#0B0F0E] text-[#8C9A93] border-[#223027]'
            }`}>
              {step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span className={`text-[10px] font-semibold tracking-wide uppercase mt-1 ${
              step >= s.num ? 'text-[#E8EDEA]' : 'text-[#8C9A93]'
            }`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-400 text-xs text-center">
          {error}
        </div>
      )}

      {/* Stepper Content */}
      <div className="bg-[#121A17] border border-[#223027] p-8 rounded-xl shadow-lg space-y-6">
        
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">RFQ Title</label>
              <input
                type="text"
                value={basicInfo.title}
                onChange={(e) => setBasicInfo(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E]"
                placeholder="e.g. Standard Office Desktop PCs Procurement"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Category</label>
                <select
                  value={basicInfo.category}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="IT Hardware">IT Hardware</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Construction">Construction</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Other">Other Services</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Submission Deadline</label>
                <input
                  type="date"
                  value={basicInfo.deadline}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Detailed Description</label>
              <textarea
                value={basicInfo.description}
                onChange={(e) => setBasicInfo(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E]"
                placeholder="Include specifications, required certifications, standards, or SLA deliverables..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Line Items */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-[#22C55E] uppercase tracking-wide">Procurement Items Checklist</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-[11px] font-semibold bg-[#1a2d24] text-[#22C55E] border border-[#22C55E]/30 px-3 py-1.5 rounded-lg hover:bg-[#22C55E]/10 cursor-pointer transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-3 items-center bg-[#0B0F0E] border border-[#223027] p-3 rounded-lg animate-fade-in">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      className="w-full bg-transparent border-0 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/35 focus:ring-0 focus:outline-none"
                      placeholder="e.g. 15-inch Display Monitor or UPS Battery Backup"
                      required
                    />
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      value={item.quantity}
                      min="1"
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full bg-[#121A17] border border-[#223027] rounded-lg px-3 py-1.5 text-xs text-[#E8EDEA] text-center focus:outline-none focus:border-[#22C55E]"
                      placeholder="Qty"
                      required
                    />
                  </div>

                  <div className="w-20">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="w-full bg-[#121A17] border border-[#223027] rounded-lg px-3 py-1.5 text-xs text-[#E8EDEA] text-center focus:outline-none focus:border-[#22C55E]"
                      placeholder="Unit"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={lineItems.length === 1}
                    className="p-2 text-rose-500 hover:bg-rose-550/10 hover:text-rose-400 rounded-lg disabled:opacity-35 cursor-pointer transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Assign Vendors & Publish */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-semibold text-[#22C55E] uppercase tracking-wide mb-3">Invite Registered Vendors</h3>
              {loadingVendors ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-[#22C55E]" />
                </div>
              ) : vendors.length === 0 ? (
                <div className="p-4 bg-amber-950/20 border border-amber-900/40 text-amber-300 text-xs rounded-lg text-center">
                  No Active vendors registered. Please add active vendors first in the Registry.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-[#223027] rounded-lg divide-y divide-[#223027]">
                  {vendors.map(v => (
                    <label
                      key={v.id}
                      className="flex items-center gap-3 px-4 py-3 bg-[#0B0F0E] hover:bg-[#16211d]/50 cursor-pointer text-sm text-[#E8EDEA] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVendors.includes(v.id)}
                        onChange={() => handleToggleVendor(v.id)}
                        className="rounded text-[#22C55E] focus:ring-[#22C55E] bg-[#121A17] border-[#223027] h-4 w-4"
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="font-medium">{v.name}</span>
                        <span className="text-xs text-[#8C9A93]">{v.category}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Publish immediately toggle */}
            <div className="border-t border-[#223027]/40 pt-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-[#E8EDEA] block">Publish Immediately</span>
                <span className="text-[11px] text-[#8C9A93]">If selected, this RFQ will go live and invite notifications will trigger immediately.</span>
              </div>
              <input
                type="checkbox"
                checked={publishImmediately}
                onChange={(e) => setPublishImmediately(e.target.checked)}
                className="rounded text-[#22C55E] focus:ring-[#22C55E] bg-[#121A17] border-[#223027] h-5 w-5 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Stepper Footer Controls */}
        <div className="flex justify-between border-t border-[#223027]/40 pt-6 mt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2 border border-[#223027] rounded-lg text-xs text-[#8C9A93] hover:text-[#E8EDEA] disabled:opacity-35 cursor-pointer transition-all"
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold px-5 py-2 rounded-lg text-xs cursor-pointer transition-all"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold px-5 py-2 rounded-lg text-xs cursor-pointer transition-all disabled:opacity-55"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating RFQ...</span>
                </>
              ) : (
                <span>Create RFQ</span>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default RFQCreate;
