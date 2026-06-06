import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect straight to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0E] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
      {/* Login Card */}
      <div className="w-[95%] sm:w-[75%] md:w-[50%] lg:w-[35%] xl:w-[28%] min-w-[320px] max-w-[480px] bg-[#121A17] border border-[#223027] rounded-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-[#22C55E]/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-[#22C55E]/10 rounded-full blur-2xl"></div>

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
          <p className="text-xs text-[#94A3B8] mt-1">Digital Procurement Network</p>
        </div>

        <h2 className="text-base font-semibold text-[#E8EDEA] mb-1 text-center">Welcome Back</h2>
        <p className="text-xs text-[#94A3B8] mb-6 text-center">Log in to manage procurements & vendor quotations</p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#94A3B8]/40 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/50 transition-all duration-200"
              placeholder="e.g. officer@vendorbridge.com"
              required
            />
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#94A3B8]/40 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/50 transition-all duration-200"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#22C55E]/15 disabled:opacity-55"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-black" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Demo Credentials Alert Box */}
        <div className="mt-6 p-3 bg-[#16211d] border border-[#223027] rounded-lg text-[11px] text-[#94A3B8] space-y-2">
          <p className="font-semibold text-[#22C55E]">Try out these seeded credentials:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
            <div className="break-all"><span className="font-medium text-[#E8EDEA]">Officer:</span> officer@vendorbridge.com</div>
            <div className="break-all"><span className="font-medium text-[#E8EDEA]">Manager:</span> priya@vendorbridge.com</div>
            <div className="break-all"><span className="font-medium text-[#E8EDEA]">Vendor 1:</span> vendor1@acme.com</div>
            <div className="break-all"><span className="font-medium text-[#E8EDEA]">Vendor 2:</span> vendor2@globaltech.com</div>
          </div>
          <p className="text-[9px] pt-1.5 border-t border-[#223027] text-center">Password for all is <code className="text-[#22C55E]">password123</code></p>
        </div>

        {/* Register Redirect */}
        <div className="mt-6 text-center text-xs text-[#94A3B8]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#22C55E] hover:underline font-medium">
            Register as a Vendor
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
