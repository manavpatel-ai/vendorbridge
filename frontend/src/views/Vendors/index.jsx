import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utility/context/AuthContext';
import { Search, Plus, Star, MapPin, Mail, Phone, Loader2, Edit3, X, SlidersHorizontal } from 'lucide-react';
import api from '../../utility/api';

const Vendors = () => {
  const { hasRole } = useAuth();
  const isStaff = hasRole(['admin', 'procurement_officer']);
  
  const [vendors, setVendors] = useState([]);
  const [counts, setCounts] = useState({ all: 0, active: 0, pending: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // empty string means "all"
  const [categoryFilter, setCategoryFilter] = useState('');
  
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
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVendors();
  };

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDEA]">Vendor Registry</h1>
          <p className="text-xs text-[#8C9A93] mt-1">
            Manage your network of external vendor partners and their approval status.
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-[#22C55E]/15"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vendor</span>
          </button>
        )}
      </div>

      {/* Search & Filters Panel */}
      <div className="bg-[#121A17] border border-[#223027] p-5 rounded-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-[#8C9A93]/60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by vendor name, category, contact, or GSTIN..."
              className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg pl-10 pr-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/30 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30"
            />
          </div>
          <button
            type="submit"
            className="bg-[#1a2d24] text-[#22C55E] border border-[#223027] hover:border-[#22C55E]/40 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-4 items-center justify-between pt-2">
          {/* Tab Filters */}
          <div className="flex gap-2">
            {[
              { label: 'All', value: '', count: counts.all },
              { label: 'Active', value: 'active', count: counts.active },
              { label: 'Pending', value: 'pending', count: counts.pending },
              { label: 'Blocked', value: 'blocked', count: counts.blocked }
            ].map(tab => (
              <button
                key={tab.label}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  statusFilter === tab.value
                    ? 'bg-[#1a2d24] text-[#22C55E] border border-[#22C55E]/30'
                    : 'text-[#8C9A93] hover:text-[#E8EDEA] border border-transparent'
                }`}
              >
                {tab.label} <span className="text-[10px] opacity-75 font-mono ml-1">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#8C9A93]" />
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

      {/* Vendors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-[#121A17] rounded-xl border border-[#223027] animate-pulse"></div>
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-12 bg-[#121A17] border border-[#223027] rounded-xl">
          <p className="text-sm text-[#8C9A93]">No vendors matching your filters were found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map(vendor => (
            <div
              key={vendor.id}
              className="bg-[#121A17] border border-[#223027] rounded-xl p-5 hover:border-[#22C55E]/40 hover:scale-[1.01] transition-all duration-200 flex flex-col justify-between shadow-md"
            >
              {/* Card Top */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[#E8EDEA] text-sm truncate max-w-[170px]" title={vendor.name}>
                      {vendor.name}
                    </h3>
                    <span className="text-[10px] bg-[#1a2d24] text-[#22C55E] px-2 py-0.5 rounded font-medium mt-1 inline-block">
                      {vendor.category}
                    </span>
                  </div>
                  
                  {/* Status Badges */}
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      vendor.status === 'active' 
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
                        : vendor.status === 'pending'
                        ? 'bg-amber-950/40 text-amber-400 border border-amber-900/60'
                        : 'bg-rose-950/40 text-rose-400 border border-rose-900/60'
                    }`}>
                      {vendor.status}
                    </span>
                    <div className="flex items-center text-amber-400 text-xs font-semibold gap-0.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <span>{parseFloat(vendor.rating).toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-2 border-t border-[#223027]/40 pt-3 text-xs text-[#8C9A93]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#E8EDEA]">{vendor.contact_name || 'No contact'}</span>
                  </div>
                  {vendor.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-[#8C9A93]/60" />
                      <span className="truncate">{vendor.contact_email}</span>
                    </div>
                  )}
                  {vendor.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-[#8C9A93]/60" />
                      <span>{vendor.contact_phone}</span>
                    </div>
                  )}
                  {vendor.gst_number && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono mt-1 text-[#E8EDEA]">
                      <span>GSTIN:</span>
                      <span className="text-[#22C55E] font-semibold">{vendor.gst_number}</span>
                    </div>
                  )}
                  {vendor.address && (
                    <div className="flex items-start gap-1.5 text-[11px] mt-2">
                      <MapPin className="h-3.5 w-3.5 text-[#8C9A93]/60 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{vendor.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status control for Staff users */}
              {isStaff && (
                <div className="border-t border-[#223027]/40 pt-4 mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#8C9A93] uppercase">Set Status</span>
                  <div className="flex gap-1">
                    {['active', 'pending', 'blocked'].map(st => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(vendor.id, st)}
                        disabled={vendor.status === st}
                        className={`text-[9px] font-semibold px-2 py-1 rounded transition-all cursor-pointer ${
                          vendor.status === st
                            ? 'bg-[#1a2d24] text-[#22C55E] cursor-default'
                            : 'bg-[#0B0F0E] text-[#8C9A93] hover:text-[#E8EDEA] border border-[#223027]'
                        }`}
                      >
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#121A17] border border-[#223027] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 text-[#8C9A93] hover:text-[#E8EDEA] hover:bg-[#16211d] rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 border-b border-[#223027] bg-[#0F1513]">
              <h2 className="text-lg font-semibold text-[#E8EDEA]">Add Vendor Profile</h2>
              <p className="text-xs text-[#8C9A93]">Register a new vendor partner in the system.</p>
            </div>

            <form onSubmit={handleCreateVendor} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-400 text-xs text-center">
                  {modalError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Vendor/Company Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E]"
                    placeholder="e.g. Apex Industrial Solutions"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] focus:outline-none focus:border-[#22C55E]"
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
                    <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">GSTIN Number</label>
                    <input
                      type="text"
                      name="gst_number"
                      value={formData.gst_number}
                      onChange={handleInputChange}
                      className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E]"
                      placeholder="e.g. 29AAAAA1111A1Z1"
                    />
                  </div>
                </div>

                <div className="border-t border-[#223027]/40 pt-4 space-y-3">
                  <span className="text-[11px] font-semibold text-[#22C55E] uppercase tracking-wide">Contact Person Details</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-semibold text-[#8C9A93] mb-1 uppercase">Name</label>
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
                      <label className="block text-[10px] font-semibold text-[#8C9A93] mb-1 uppercase">Email</label>
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
                      <label className="block text-[10px] font-semibold text-[#8C9A93] mb-1 uppercase">Phone</label>
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
                  <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Company Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E]"
                    placeholder="Physical office address..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#223027]/40">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#223027] hover:border-[#8C9A93]/30 rounded-lg text-sm text-[#8C9A93] hover:text-[#E8EDEA] cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all cursor-pointer disabled:opacity-55"
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
