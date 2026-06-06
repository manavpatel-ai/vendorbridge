import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Check, 
  Loader2, 
  X, 
  Upload, 
  Paperclip,
  UserPlus
} from 'lucide-react';
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

  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    category: 'Furniture', // Default to Furniture to match sketch
    deadline: '',
    description: ''
  });

  const [lineItems, setLineItems] = useState([
    { item_name: '', quantity: 1, unit: 'Nos' }
  ]);

  const [selectedVendors, setSelectedVendors] = useState([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  
  // File attachments state
  const [filesList, setFilesList] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch active vendors
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
    fetchActiveVendors();
  }, []);

  // Form validation
  const validateForm = (isPublish) => {
    if (!basicInfo.title.trim()) return "RFQ Title is required";
    if (!basicInfo.deadline) return "Submission Deadline is required";
    
    const deadlineDate = new Date(basicInfo.deadline);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (deadlineDate < today) return "Deadline cannot be in the past";

    for (let i = 0; i < lineItems.length; i++) {
      if (!lineItems[i].item_name.trim()) {
        return `Item #${i + 1} Name cannot be empty`;
      }
      if (lineItems[i].quantity <= 0) {
        return `Item #${i + 1} Quantity must be greater than 0`;
      }
    }

    if (isPublish && selectedVendors.length === 0) {
      return "Please select at least one vendor to invite before sending.";
    }
    
    return "";
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

  // Assigned vendors handler
  const handleRemoveVendor = (vendorId) => {
    setSelectedVendors(selectedVendors.filter(id => id !== vendorId));
  };

  // Drag & drop file handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFilesList(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFilesList(prev => [...prev, ...selected]);
    }
  };

  const removeFile = (index) => {
    setFilesList(filesList.filter((_, idx) => idx !== index));
  };

  const triggerSubmit = async (isPublish) => {
    setError('');
    const validationErr = validateForm(isPublish);
    if (validationErr) {
      setError(validationErr);
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
        publish: isPublish
      };

      // 1. Create the RFQ in backend
      const rfqRes = await api.post('/rfqs/', payload);
      const newRfqId = rfqRes.data.id;

      // 2. Upload attachments sequentially if present
      if (filesList.length > 0) {
        for (const fileObj of filesList) {
          const formData = new FormData();
          formData.append('file', fileObj);
          await api.post(`/rfqs/${newRfqId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      navigate('/rfqs');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to create RFQ. Please check fields.");
    } finally {
      setSubmitting(false);
    }
  };

  // Map selected vendor IDs to their names
  const assignedVendorObjects = vendors.filter(v => selectedVendors.includes(v.id));
  const unselectedVendors = vendors.filter(v => !selectedVendors.includes(v.id));

  return (
    <div className="space-y-8 w-full max-w-[95%] lg:max-w-[90%] xl:max-w-[85%] mx-auto">
      {/* Back to list */}
      <button
        onClick={() => navigate('/rfqs')}
        className="flex items-center gap-2 text-xs text-[#8C9A93] hover:text-[#E8EDEA] transition-all cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to RFQ List
      </button>

      {/* Header aligned with sketch */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E8EDEA] tracking-tight">Create RFQ's</h1>
          <p className="text-xs sm:text-sm text-[#8C9A93] mt-1 font-medium">
            new request for quotation
          </p>
        </div>
      </div>

      {/* Stepper Header (Static visual indicator of preparation flow) */}
      <div className="relative flex justify-between items-center bg-[#121A17] border border-[#223027] px-8 py-3.5 rounded-xl">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#22C55E]/40 -translate-y-1/2 z-0 mx-16"></div>
        
        {[
          { label: 'Prepare Info', num: 1 },
          { label: 'Add Items', num: 2 },
          { label: 'Invite Vendors', num: 3 }
        ].map(s => (
          <div key={s.num} className="relative z-10 flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs bg-[#1a2d24] text-[#22C55E] border border-[#22C55E] shadow-lg shadow-[#22C55E]/10">
              {s.num}
            </div>
            <span className="text-[10px] font-semibold tracking-wide uppercase mt-1 text-[#E8EDEA]">
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

      {/* Side-by-Side Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Basic Info */}
        <div className="bg-[#121A17] border border-[#223027] p-8 rounded-xl shadow-lg space-y-5">
          <h3 className="text-xs font-semibold text-[#22C55E] uppercase tracking-wider border-b border-[#223027] pb-3 mb-2">
            Basic Specifications
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">
                RFQ's title*
              </label>
              <input
                type="text"
                value={basicInfo.title}
                onChange={(e) => setBasicInfo(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/20"
                placeholder="e.g. Office Furniture procurement Q2"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">
                Category
              </label>
              <select
                value={basicInfo.category}
                onChange={(e) => setBasicInfo(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/20"
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
              <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">
                Deadline*
              </label>
              <input
                type="date"
                value={basicInfo.deadline}
                onChange={(e) => setBasicInfo(prev => ({ ...prev, deadline: e.target.value }))}
                className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={basicInfo.description}
                onChange={(e) => setBasicInfo(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/20"
                placeholder="Include specifications, warranty terms, or location notes (e.g., Ergonomic chairs and standing desks for 3rd floor)..."
              />
            </div>
          </div>
        </div>

        {/* Right Column: Line Items & Assigned Vendors */}
        <div className="space-y-8">
          
          {/* Line Items Box */}
          <div className="bg-[#121A17] border border-[#223027] p-8 rounded-xl shadow-lg space-y-4">
            <h3 className="text-xs font-semibold text-[#22C55E] uppercase tracking-wider border-b border-[#223027] pb-3">
              Line items
            </h3>

            <div className="border border-[#223027] rounded-lg overflow-hidden bg-[#0B0F0E]/40">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#0F1513] border-b border-[#223027] text-[#8C9A93]">
                    <th className="p-3 font-semibold uppercase tracking-wider">item</th>
                    <th className="p-3 font-semibold uppercase tracking-wider text-center w-24">qty</th>
                    <th className="p-3 font-semibold uppercase tracking-wider text-center w-24">Unit</th>
                    <th className="p-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#223027]/40">
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#16211d]/20 transition-colors">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                          className="w-full bg-transparent border-0 text-[#E8EDEA] placeholder-[#8C9A93]/30 focus:ring-0 focus:outline-none text-xs"
                          placeholder="e.g. Ergonomic chair"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.quantity}
                          min="1"
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-[#121A17] border border-[#223027] rounded px-2 py-1 text-[#E8EDEA] text-center text-xs focus:outline-none focus:border-[#22C55E]"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full bg-[#121A17] border border-[#223027] rounded px-2 py-1 text-[#E8EDEA] text-center text-xs focus:outline-none focus:border-[#22C55E]"
                          placeholder="Unit"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={lineItems.length === 1}
                          className="p-1 text-rose-500 hover:text-rose-400 hover:bg-rose-950/20 rounded disabled:opacity-35 cursor-pointer transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#1a2d24] text-[#22C55E] border border-[#22C55E]/30 px-3.5 py-2 rounded-lg hover:bg-[#22C55E]/10 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>+ add line item</span>
            </button>
          </div>

          {/* Assign Vendors Box */}
          <div className="bg-[#121A17] border border-[#223027] p-8 rounded-xl shadow-lg space-y-4 relative">
            <h3 className="text-xs font-semibold text-[#22C55E] uppercase tracking-wider border-b border-[#223027] pb-3">
              ASSIGN VENDORS
            </h3>

            <div className="border border-[#223027] rounded-lg divide-y divide-[#223027] bg-[#0B0F0E]/40 overflow-hidden min-h-[44px]">
              {assignedVendorObjects.length === 0 ? (
                <div className="p-4 text-xs text-[#8C9A93] italic text-center">
                  No suppliers assigned yet. Click add vendor below.
                </div>
              ) : (
                assignedVendorObjects.map(vendor => (
                  <div 
                    key={vendor.id} 
                    className="p-3 flex justify-between items-center text-xs text-[#E8EDEA] hover:bg-[#16211d]/20 transition-colors"
                  >
                    <div>
                      <span className="font-semibold">{vendor.name}</span>
                      <span className="text-[10px] text-[#8C9A93] bg-[#121A17] border border-[#223027]/40 px-2 py-0.5 rounded ml-2">
                        {vendor.category}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVendor(vendor.id)}
                      className="p-1 rounded text-rose-500 hover:text-rose-450 hover:bg-rose-950/20 transition-all cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Vendor Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVendorDropdown(!showVendorDropdown)}
                className="flex items-center gap-1.5 text-xs font-semibold bg-[#1a2d24] text-[#22C55E] border border-[#22C55E]/30 px-3.5 py-2 rounded-lg hover:bg-[#22C55E]/10 cursor-pointer transition-all"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ add vendor</span>
              </button>

              {showVendorDropdown && (
                <div className="absolute left-0 right-0 mt-2 bg-[#121A17] border border-[#223027] rounded-lg shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-[#223027]/40">
                  <div className="p-2 bg-[#0F1513] text-[10px] font-bold text-[#8C9A93] uppercase tracking-wider">
                    Select Active Supplier
                  </div>
                  {unselectedVendors.length === 0 ? (
                    <div className="p-4 text-xs text-[#8C9A93] text-center italic">
                      No more active vendors available
                    </div>
                  ) : (
                    unselectedVendors.map(vendor => (
                      <div
                        key={vendor.id}
                        onClick={() => {
                          setSelectedVendors([...selectedVendors, vendor.id]);
                          setShowVendorDropdown(false);
                        }}
                        className="p-3 text-xs text-[#E8EDEA] hover:bg-[#1a2d24] hover:text-[#22C55E] cursor-pointer transition-colors flex justify-between items-center"
                      >
                        <span className="font-semibold">{vendor.name}</span>
                        <span className="text-[10px] text-[#8C9A93] bg-[#0B0F0E] px-2.5 py-0.5 rounded border border-[#223027]">
                          {vendor.category}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Section: Save Buttons on Left, Attachments Block on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pt-4 border-t border-[#223027]/60">
        
        {/* Bottom Left: Action buttons aligned with sketch */}
        <div className="flex flex-col gap-4 max-w-xs">
          <button
            onClick={() => triggerSubmit(true)}
            disabled={submitting}
            className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-black font-bold py-3 rounded-lg text-xs cursor-pointer shadow-lg shadow-[#22C55E]/10 hover:shadow-xl hover:shadow-[#22C55E]/20 transition-all duration-300 flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>Save & Send to Vendors</span>
          </button>

          <button
            onClick={() => triggerSubmit(false)}
            disabled={submitting}
            className="w-full bg-[#16211d] border border-[#223027] hover:border-[#22C55E]/40 text-[#E8EDEA] font-semibold py-3 rounded-lg text-xs cursor-pointer transition-all duration-300 flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 text-[#8C9A93]" />
            )}
            <span>Save as Draft</span>
          </button>
        </div>

        {/* Bottom Right: Drag & Drop Attachments Box aligned with sketch */}
        <div className="space-y-4">
          <span className="block text-xs font-semibold text-[#8C9A93] uppercase tracking-wider">
            Attachments
          </span>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('rfq-file-upload').click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#22C55E] bg-[#22C55E]/5'
                : 'border-[#223027] bg-[#121A17] hover:border-[#22C55E]/40'
            }`}
          >
            <input
              type="file"
              id="rfq-file-upload"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            
            <Upload className="h-8 w-8 text-[#8C9A93] mx-auto mb-3" />
            <p className="text-xs text-[#E8EDEA] font-medium">
              Drag & drop files or click to upload
            </p>
            <p className="text-[10px] text-[#8C9A93] mt-1">
              Supports specifications PDFs, terms documents, or designs
            </p>
          </div>

          {/* Uploaded files listing */}
          {filesList.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {filesList.map((file, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2.5 bg-[#121A17] border border-[#223027] rounded-lg text-xs text-[#E8EDEA] animate-fade-in"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="h-4 w-4 text-[#22C55E] flex-shrink-0" />
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="text-[9px] text-[#8C9A93] font-mono">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 text-rose-500 hover:bg-rose-950/20 rounded transition-all cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RFQCreate;
