import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../../utility/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    country: 'India',
    role: 'procurement_officer',
    vendor_name: '',
    vendor_category: 'IT Hardware',
    vendor_gst_number: '',
    vendor_address: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Clean request body depending on selected role
      const payload = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        phone: formData.phone || null,
        country: formData.country || null,
        role: formData.role
      };

      if (formData.role === 'vendor') {
        payload.vendor_name = formData.vendor_name;
        payload.vendor_category = formData.vendor_category;
        payload.vendor_gst_number = formData.vendor_gst_number || null;
        payload.vendor_address = formData.vendor_address || null;
      }

      await api.post('/auth/register', payload);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Registration failed. Please check details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0E] flex flex-col items-center justify-center p-4 py-12">
      {/* Register Card */}
      <div className="w-full max-w-2xl bg-[#121A17] border border-[#223027] rounded-xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-[#22C55E]/10 rounded-full blur-2xl"></div>

        {/* Circular Logo & Brand Info */}
        <div className="flex flex-col items-center mb-6 relative z-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#1b3d2b] to-[#0B0F0E] border-2 border-[#22C55E]/30 flex items-center justify-center shadow-lg shadow-[#22C55E]/10 mb-3 relative overflow-hidden group hover:border-[#22C55E]/80 transition-all duration-300">
            {/* Logo background interactive glow */}
            <div className="absolute inset-0 bg-[#22C55E]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            {/* SVG Shield + Bridge Logo */}
            <svg viewBox="0 0 100 100" className="w-11 h-11 text-[#22C55E]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 20 C62 20 72 24 72 24 V46 C72 59 59 69 50 76 C41 69 28 59 28 46 V24 C28 24 38 20 50 20 Z" fill="#121A17" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M38 48 C38 41 62 41 62 48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M34 54 H66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="44" y1="48" x2="44" y2="54" stroke="currentColor" strokeWidth="2.5" />
              <line x1="56" y1="48" x2="56" y2="54" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </div>
          <span className="font-bold text-2xl tracking-wider text-[#E8EDEA]">
            Vendor<span className="text-[#22C55E]">Bridge</span>
          </span>
          <p className="text-xs text-[#8C9A93] mt-1">Digital Procurement Network</p>
        </div>

        <h2 className="text-base font-semibold text-[#E8EDEA] mb-1 text-center">Create Account</h2>
        <p className="text-xs text-[#8C9A93] mb-6 text-center">Register to join the VendorBridge digital procurement network</p>

        {success ? (
          <div className="p-6 bg-[#1a2d24] border border-[#22C55E]/40 rounded-lg text-center space-y-3">
            <p className="text-[#22C55E] font-medium text-sm">Account Registered Successfully!</p>
            <p className="text-xs text-[#8C9A93]">Redirecting you to the login screen in a few seconds...</p>
            <Loader2 className="h-6 w-6 animate-spin text-[#22C55E] mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-400 text-xs text-center">
                {error}
              </div>
            )}

            {/* Grid 1: Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all duration-200"
                  placeholder="John"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all duration-200"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all duration-200"
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all duration-200"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all duration-200"
                  placeholder="+91 9876543210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Role Type</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all duration-200"
                >
                  <option value="procurement_officer">Procurement Officer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator (Audit/System)</option>
                  <option value="vendor">External Vendor Partner</option>
                </select>
              </div>
            </div>

            {/* Slide Down: Vendor Info */}
            {formData.role === 'vendor' && (
              <div className="border-t border-[#223027] pt-5 space-y-4 animate-slide-down">
                <h3 className="text-sm font-semibold text-[#22C55E]">Vendor Organization Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Company Name</label>
                    <input
                      type="text"
                      name="vendor_name"
                      value={formData.vendor_name}
                      onChange={handleChange}
                      className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all duration-200"
                      placeholder="e.g. Acme Supplies Pvt Ltd"
                      required={formData.role === 'vendor'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Business Category</label>
                    <select
                      name="vendor_category"
                      value={formData.vendor_category}
                      onChange={handleChange}
                      className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all duration-200"
                    >
                      <option value="IT Hardware">IT Hardware</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Construction">Construction</option>
                      <option value="Stationery">Stationery</option>
                      <option value="Other">Other Services</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">GSTIN Number</label>
                    <input
                      type="text"
                      name="vendor_gst_number"
                      value={formData.vendor_gst_number}
                      onChange={handleChange}
                      className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all duration-200"
                      placeholder="e.g. 29AAAAA1111A1Z1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Company Address</label>
                    <textarea
                      name="vendor_address"
                      value={formData.vendor_address}
                      onChange={handleChange}
                      rows={3}
                      className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/20 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30 transition-all duration-200"
                      placeholder="Full company correspondence address..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#22C55E]/15 disabled:opacity-55"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>Registering Account...</span>
                </>
              ) : (
                <span>Register</span>
              )}
            </button>
          </form>
        )}

        {/* Login Redirect */}
        <div className="mt-6 text-center text-xs text-[#8C9A93]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#22C55E] hover:underline font-medium">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
