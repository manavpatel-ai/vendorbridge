import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { 
  Search, 
  Plus, 
  Star, 
  MapPin, 
  Mail, 
  Phone, 
  Loader2, 
  X, 
  SlidersHorizontal,
  Building2,
  UserCheck,
  ShieldAlert,
  Award
} from 'lucide-react';
import api from '../../utility/api';

const Vendors = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer']);
  
  const [vendors, setVendors] = useState([]);
  const [counts, setCounts] = useState({ all: 0, active: 0, pending: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // empty string means "all"
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Detail overlay state
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'IT Hardware',
    gst_number: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    address: ''
  });

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.q = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await api.get('/vendors/', { params });
      setVendors(res.data.vendors);
      setCounts(res.data.counts);
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [statusFilter, categoryFilter, searchTerm]);

  const handleStatusChange = async (vendorId, newStatus) => {
    try {
      await api.patch(`/vendors/${vendorId}/status`, null, {
        params: { status: newStatus }
      });
      fetchVendors();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update vendor status");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        gst_number: formData.gst_number || null,
        contact_name: formData.contact_name || null,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        address: formData.address || null
      };

      await api.post('/vendors/', payload);
      setShowAddModal(false);
      // Reset form
      setFormData({
        name: '',
        category: 'IT Hardware',
        gst_number: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        address: ''
      });
      fetchVendors();
    } catch (err) {
      console.error(err);
      setModalError(err.response?.data?.detail || "Failed to create vendor profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatRating = (val) => {
    return parseFloat(val || 0).toFixed(1);
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header matching user's sketch */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E8EDEA] tracking-tight">Vendors</h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-medium">
            Manage supplier profiles and registrations
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold px-4 py-2.5 rounded-lg text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-[#22C55E]/15 hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Vendor</span>
          </button>
        )}
      </div>

      {/* Full Width Search Input from Sketch */}
      <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl shadow-md space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-3 h-5 w-5 text-[#94A3B8]/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, gst number, category..."
            className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg pl-12 pr-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#94A3B8]/30 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all"
          />
        </div>

        {/* Tab Filters and Category Dropdown aligned */}
        <div className="flex flex-wrap gap-4 items-center justify-between pt-2 border-t border-[#223027]/40">
          <div className="flex gap-2 overflow-x-auto py-1">
            {[
              { label: 'All', value: '', count: counts.all },
              { label: 'active', value: 'active', count: counts.active },
              { label: 'Pending', value: 'pending', count: counts.pending },
              { label: 'Blocked', value: 'blocked', count: counts.blocked }
            ].map(tab => (
              <button
                key={tab.label}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap capitalize ${
                  statusFilter === tab.value
                    ? 'bg-[#1a2d24] text-[#22C55E] border border-[#22C55E]/30'
                    : 'text-[#94A3B8] hover:text-[#E8EDEA] border border-transparent'
                }`}
              >
                {tab.label} <span className="text-[10px] opacity-75 font-mono ml-1">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#94A3B8]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#0B0F0E] border border-[#223027] text-xs text-[#E8EDEA] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#22C55E]"
            >
              <option value="">All Categories</option>
              <option value="IT Hardware">IT Hardware</option>
              <option value="Furniture">Furniture</option>
              <option value="Logistics">Logistics</option>
              <option value="Construction">Construction</option>
              <option value="Stationery">Stationery</option>
              <option value="Other">Other Services</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Vendor Data Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16 bg-[#121A17] border border-[#223027] rounded-xl">
          <p className="text-sm text-[#94A3B8] italic">No vendors matching your search filter were found.</p>
        </div>
      ) : (
        <div className="bg-[#121A17] border border-[#223027] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-[#0F1513] border-b border-[#223027] text-[#94A3B8]">
                  <th className="p-4 font-semibold uppercase tracking-wider">Vendor Name</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Category</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">GST no.</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">contact no.</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Status</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#223027]/40">
                {vendors.map(vendor => (
                  <tr 
                    key={vendor.id}
                    className="hover:bg-[#16211d]/50 transition-colors"
                  >
                    {/* Vendor Name & Circular Avatar */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#1b3d2b] border border-[#22C55E]/40 flex items-center justify-center font-bold text-[#22C55E] flex-shrink-0 text-xs">
                          {vendor.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-[#E8EDEA] text-sm block">{vendor.name}</span>
                          <span className="text-[10px] text-[#94A3B8] block mt-0.5">{vendor.contact_email || 'No Email'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-4">
                      <span className="text-xs text-[#E8EDEA] font-medium">{vendor.category}</span>
                    </td>

                    {/* GST no. */}
                    <td className="p-4">
                      <span className="font-mono text-[#94A3B8]">{vendor.gst_number || 'N/A'}</span>
                    </td>

                    {/* contact no. */}
                    <td className="p-4">
                      <span className="text-[#E8EDEA]">{vendor.contact_phone || 'N/A'}</span>
                    </td>

                    {/* Status badge */}
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                        vendor.status === 'active' 
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
                          : vendor.status === 'pending'
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-900/60'
                          : 'bg-rose-950/40 text-rose-400 border border-rose-900/60'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>

                    {/* Action button matching sketch */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => navigate(`/vendors/${vendor.id}`)}
                        className="px-4 py-1.5 border border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E] hover:text-black font-semibold rounded-lg transition-all duration-200 cursor-pointer text-xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#121A17] border border-[#223027] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 text-[#94A3B8] hover:text-[#E8EDEA] hover:bg-[#16211d] rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 border-b border-[#223027] bg-[#0F1513]">
              <h2 className="text-lg font-semibold text-[#E8EDEA]">Add Vendor Profile</h2>
              <p className="text-xs text-[#94A3B8]">Register a new vendor partner in the system.</p>
            </div>

            <form onSubmit={handleCreateVendor} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-400 text-xs text-center">
                  {modalError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Vendor/Company Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#94A3B8]/20 focus:outline-none focus:border-[#22C55E]"
                    placeholder="e.g. Apex Industrial Solutions"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
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
                    <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">GSTIN Number</label>
                    <input
                      type="text"
                      name="gst_number"
                      value={formData.gst_number}
                      onChange={handleInputChange}
                      className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#94A3B8]/20 focus:outline-none focus:border-[#22C55E]"
                      placeholder="e.g. 29AAAAA1111A1Z1"
                    />
                  </div>
                </div>

                <div className="border-t border-[#223027]/40 pt-4 space-y-3">
                  <span className="text-[11px] font-semibold text-[#22C55E] uppercase tracking-wide">Contact Person Details</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-semibold text-[#94A3B8] mb-1 uppercase">Name</label>
                      <input
                        type="text"
                        name="contact_name"
                        value={formData.contact_name}
                        onChange={handleInputChange}
                        className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-3 py-1.5 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                        placeholder="Alice Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#94A3B8] mb-1 uppercase">Email</label>
                      <input
                        type="email"
                        name="contact_email"
                        value={formData.contact_email}
                        onChange={handleInputChange}
                        className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-3 py-1.5 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                        placeholder="alice@apex.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#94A3B8] mb-1 uppercase">Phone</label>
                      <input
                        type="text"
                        name="contact_phone"
                        value={formData.contact_phone}
                        onChange={handleInputChange}
                        className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-3 py-1.5 text-xs text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
                        placeholder="+91 9999900000"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Company Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#94A3B8]/20 focus:outline-none focus:border-[#22C55E]"
                    placeholder="Physical office address..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#223027]/40">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#223027] hover:border-[#94A3B8]/30 rounded-lg text-sm text-[#94A3B8] hover:text-[#E8EDEA] cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-all cursor-pointer disabled:opacity-55"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
