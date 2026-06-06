import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { ArrowLeft, Calendar, FileText, Check, Paperclip, Upload, Loader2, UserCheck, ChevronRight } from 'lucide-react';
import api from '../../utility/api';

const RFQDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer']);

  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const fetchRfqDetails = async () => {
    try {
      const res = await api.get(`/rfqs/${id}`);
      setRfq(res.data);
    } catch (err) {
      console.error("Failed to load RFQ:", err);
      alert("RFQ not found or access denied.");
      navigate('/rfqs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqDetails();
  }, [id]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadError('');
  };

  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/rfqs/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      // Reset input element
      document.getElementById('attachment-file-input').value = '';
      fetchRfqDetails();
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.detail || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
        <Loader2 className="h-8 w-8 animate-spin text-[#22C55E] mb-2" />
        <span>Loading RFQ details...</span>
      </div>
    );
  }

  const hasQuoted = rfq.vendors?.find(v => v.vendor_id === user?.vendor_id)?.status === 'quoted';

  return (
    <div className="space-y-8 w-full">
      {/* Back link */}
      <button
        onClick={() => navigate('/rfqs')}
        className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#E8EDEA] transition-all cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to RFQ List
      </button>

      {/* Hero Header Card */}
      <div className="bg-[#0B0F0E] border border-[#223027] p-8 rounded-xl shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div className="space-y-2">
          <span className="font-mono text-xs text-[#22C55E] font-semibold">{rfq.rfq_number}</span>
          <h1 className="text-xl font-bold text-[#E8EDEA]">{rfq.title}</h1>
          <p className="text-xs text-[#94A3B8] flex items-center gap-1.5 pt-1">
            <Calendar className="h-3.5 w-3.5" />
            Deadline for responses:{' '}
            <span className="text-[#E8EDEA] font-semibold">
              {rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : 'No deadline'}
            </span>
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
            rfq.status === 'draft' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
            rfq.status === 'published' ? 'bg-sky-950/40 text-sky-400 border border-sky-900/60' :
            rfq.status === 'under_review' || rfq.status === 'quotations_received' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/60' :
            'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
          }`}>
            {rfq.status.replace('_', ' ')}
          </span>

          {user?.role === 'vendor' && rfq.status === 'published' && (
            hasQuoted ? (
              <span className="text-xs text-[#22C55E] font-semibold flex items-center gap-1 bg-[#1a2d24] px-3 py-1.5 border border-[#22C55E]/30 rounded-lg">
                <Check className="h-3.5 w-3.5" />
                Quote Submitted
              </span>
            ) : (
              <button
                onClick={() => navigate(`/quotations/submit?rfq=${rfq.id}`)}
                className="bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer shadow-lg"
              >
                Submit Quotation Response
              </button>
            )
          )}

          {isStaff && (rfq.status === 'quotations_received' || rfq.status === 'under_review') && (
            <button
              onClick={() => navigate(`/rfqs/${rfq.id}/compare`)}
              className="bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer shadow-lg"
            >
              Compare Vendor Quotes
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Details, Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Specifications description */}
          <div className="bg-[#0B0F0E] border border-[#223027] p-6 rounded-xl space-y-3">
            <h3 className="text-xs font-semibold text-[#22C55E] uppercase tracking-wide">Procurement Details</h3>
            <p className="text-xs text-[#E8EDEA] leading-relaxed whitespace-pre-wrap">
              {rfq.description || 'No detailed specifications sheet attached to this request.'}
            </p>
          </div>

          {/* Line items table */}
          <div className="bg-[#0B0F0E] border border-[#223027] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#223027] bg-[#0F1513]">
              <h3 className="text-xs font-semibold text-[#E8EDEA] uppercase tracking-wide">Required Items & Quantities</h3>
            </div>
            <div className="divide-y divide-[#223027] bg-[#0B0F0E]">
              {rfq.line_items?.map((item) => (
                <div key={item.id} className="p-4 flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#E8EDEA]">{item.item_name}</span>
                  <span className="bg-[#0B0F0E] text-[#22C55E] px-3 py-1 rounded-full border border-[#223027] font-mono">
                    {parseInt(item.quantity)} {item.unit || 'pcs'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="bg-[#0B0F0E] border border-[#223027] p-6 rounded-xl space-y-4 shadow-md">
            <h3 className="text-xs font-semibold text-[#22C55E] uppercase tracking-wide flex items-center gap-1">
              <Paperclip className="h-4 w-4" />
              Reference Attachments ({rfq.attachments?.length || 0})
            </h3>

            {rfq.attachments?.length === 0 ? (
              <p className="text-xs text-[#94A3B8] italic">No attachments uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {rfq.attachments?.map(attach => (
                  <a
                    key={attach.id}
                    href={`http://localhost:8000${attach.file_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0B0F0E] border border-[#223027] hover:border-[#22C55E]/40 text-xs text-[#E8EDEA] hover:text-[#22C55E] transition-all"
                  >
                    <FileText className="h-4 w-4 text-[#94A3B8]" />
                    <span className="truncate">{attach.file_name}</span>
                    <span className="text-[10px] text-[#94A3B8] ml-auto">
                      {new Date(attach.uploaded_at).toLocaleDateString()}
                    </span>
                  </a>
                ))}
              </div>
            )}

            {/* Staff File Upload */}
            {isStaff && (
              <form onSubmit={handleUploadAttachment} className="border-t border-[#223027]/40 pt-4 space-y-3">
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase block">Upload Specification Document</span>
                {uploadError && <p className="text-[11px] text-rose-500">{uploadError}</p>}
                
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="attachment-file-input"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-[#94A3B8] file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1a2d24] file:text-[#22C55E] file:cursor-pointer hover:file:bg-[#22C55E]/10"
                    required
                  />
                  <button
                    type="submit"
                    disabled={uploading || !file}
                    className="flex items-center gap-1.5 bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold px-3 py-1.5 rounded-md text-xs transition-all disabled:opacity-45 cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>Upload</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right 1 Col: Invite/Quotation Statuses */}
        <div className="space-y-6">
          <div className="bg-[#0B0F0E] border border-[#223027] p-6 rounded-xl space-y-4 shadow-md">
            <h3 className="text-xs font-semibold text-[#22C55E] uppercase tracking-wide flex items-center gap-1.5">
              <UserCheck className="h-4.5 w-4.5" />
              Vendor Invitation Status
            </h3>

            <div className="space-y-3">
              {rfq.vendors?.map(v => (
                <div key={v.id} className="p-3 bg-[#0B0F0E] border border-[#223027] rounded-lg flex items-center justify-between text-xs">
                  <span className="font-medium text-[#E8EDEA] truncate max-w-[140px]">{v.vendor_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    v.status === 'quoted' 
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
                      : v.status === 'invited'
                      ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      : 'bg-rose-950/40 text-rose-400 border border-rose-900/60'
                  }`}>
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RFQDetails;
