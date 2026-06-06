import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  Loader2, 
  ArrowLeft,
  Star, 
  MapPin, 
  Mail, 
  Phone, 
  Building2,
  UserCheck,
  ShieldAlert,
  Award
} from 'lucide-react';
import api from '../../utility/api';

const VendorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer']);

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVendorDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/vendors/${id}`);
      setVendor(res.data);
    } catch (err) {
      console.error("Failed to load vendor details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (!vendor) return;
    setActionLoading(true);
    try {
      await api.patch(`/vendors/${vendor.id}/status`, null, {
        params: { status: newStatus }
      });
      setVendor(prev => ({ ...prev, status: newStatus }));
      alert(`Vendor status updated to ${newStatus}!`);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update vendor status");
    } finally {
      setActionLoading(false);
    }
  };

  const formatRating = (val) => {
    return parseFloat(val || 0).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        <span className="text-xs text-[#94A3B8]">Loading vendor details...</span>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => navigate('/vendors')}
          className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#E8EDEA] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Vendors</span>
        </button>
        <div className="bg-[#121A17] border border-[#223027] rounded-xl p-8 text-center text-[#94A3B8]">
          Vendor profile not found or failed to load.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto w-full">
      {/* Back Link */}
      <button 
        onClick={() => navigate('/vendors')}
        className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#E8EDEA] transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Vendors</span>
      </button>

      {/* Main Vendor Details Panel */}
      <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-lg">
        {/* Header Block */}
        <div className="p-6 border-b border-[#223027] bg-[#0F1513] flex justify-between items-center">
          <div>
            <span className="text-[10px] font-mono text-[#22C55E] font-semibold uppercase tracking-wider">Supplier Profile</span>
            <h2 className="text-xl font-bold text-[#E8EDEA] mt-0.5">Details Overview</h2>
          </div>
          <span className={`text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider ${
            vendor.status === 'active' 
              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
              : vendor.status === 'pending'
              ? 'bg-amber-950/40 text-amber-400 border border-amber-900/60'
              : 'bg-rose-950/40 text-rose-400 border border-rose-900/60'
          }`}>
            {vendor.status}
          </span>
        </div>

        {/* Content area: Responsive grid */}
        <div className="p-6 space-y-6">
          {/* Top section: Profile Card & Rating side by side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Card Summary */}
            <div className="md:col-span-2 flex items-center gap-4 bg-[#0B0F0E] p-5 rounded-xl border border-[#223027]/80">
              <div className="h-16 w-16 rounded-full bg-[#1b3d2b] border border-[#22C55E] flex items-center justify-center text-2xl font-bold text-[#22C55E] shadow-inner flex-shrink-0">
                {vendor.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[#E8EDEA] text-lg truncate">{vendor.name}</h3>
                <span className="text-xs bg-[#1a2d24] text-[#22C55E] px-2.5 py-0.5 rounded font-semibold mt-1 inline-block">
                  {vendor.category}
                </span>
              </div>
            </div>

            {/* Rating Card */}
            <div className="bg-[#0B0F0E]/40 border border-[#223027] p-5 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Vendor Rating</span>
                <div className="flex items-center text-amber-400 text-base font-bold gap-1">
                  <Star className="h-5 w-5 fill-amber-400" />
                  <span>{formatRating(vendor.rating)} / 5.0</span>
                </div>
              </div>
              <Award className="h-10 w-10 text-amber-400/20" />
            </div>
          </div>

          {/* Contact and Business Information side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Person Details */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="h-4 w-4" />
                Primary Contact Person
              </h4>
              <div className="bg-[#0F1513]/40 border border-[#223027] p-5 rounded-xl space-y-4 text-xs">
                <div>
                  <span className="text-[#94A3B8] block text-[10px] uppercase">Full Name</span>
                  <span className="text-[#E8EDEA] font-semibold text-sm mt-1 block">{vendor.contact_name || 'N/A'}</span>
                </div>
                {vendor.contact_email && (
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Email Address</span>
                    <a href={`mailto:${vendor.contact_email}`} className="text-[#22C55E] hover:underline flex items-center gap-1.5 mt-1">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">{vendor.contact_email}</span>
                    </a>
                  </div>
                )}
                {vendor.contact_phone && (
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Phone Number</span>
                    <a href={`tel:${vendor.contact_phone}`} className="text-[#E8EDEA] hover:text-[#22C55E] flex items-center gap-1.5 mt-1 transition-colors">
                      <Phone className="h-4 w-4 text-[#94A3B8]" />
                      <span className="text-sm">{vendor.contact_phone}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Organization / Business Information */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Business Information
              </h4>
              <div className="bg-[#0F1513]/40 border border-[#223027] p-5 rounded-xl space-y-4 text-xs">
                <div>
                  <span className="text-[#94A3B8] block text-[10px] uppercase">GSTIN / Registration Number</span>
                  <span className="font-mono text-[#E8EDEA] text-sm font-semibold mt-1 block">{vendor.gst_number || 'N/A'}</span>
                </div>
                {vendor.address && (
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Company Location Address</span>
                    <div className="flex items-start gap-1.5 mt-1.5 text-[#E8EDEA] leading-relaxed">
                      <MapPin className="h-4.5 w-4.5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{vendor.address}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Override Panel (Only for Staff roles) */}
          {isStaff && (
            <div className="border-t border-[#223027]/60 pt-6 space-y-3">
              <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                Administrative Registry Override
              </h4>
              <div className="bg-[#1c1212]/20 border border-red-950/40 p-5 rounded-xl space-y-4">
                <span className="text-[#94A3B8] text-xs block">
                  Override the registration and authorization state for this supplier:
                </span>
                <div className="flex flex-wrap sm:flex-nowrap gap-3">
                  {['active', 'pending', 'blocked'].map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      disabled={actionLoading || vendor.status === st}
                      className={`flex-1 text-xs font-bold py-2.5 rounded-lg capitalize transition-all cursor-pointer ${
                        vendor.status === st
                          ? 'bg-[#1a2d24] text-[#22C55E] border border-[#22C55E]/30 cursor-default'
                          : 'bg-[#0B0F0E] text-[#94A3B8] hover:text-[#E8EDEA] border border-[#223027] hover:border-[#22C55E]/30'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorDetails;
