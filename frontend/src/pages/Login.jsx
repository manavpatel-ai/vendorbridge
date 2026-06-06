import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ShieldCheck, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0B0F0E] flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="h-10 w-10 text-[#22C55E]" />
        <span className="font-bold text-3xl tracking-wider text-[#E8EDEA]">
          Vendor<span className="text-[#22C55E]">Bridge</span>
        </span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-[#121A17] border border-[#223027] rounded-xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-[#22C55E]/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-[#22C55E]/10 rounded-full blur-2xl"></div>

        <h2 className="text-xl font-semibold text-[#E8EDEA] mb-2 text-center">Welcome Back</h2>
        <p className="text-xs text-[#8C9A93] mb-6 text-center">Log in to manage procurements and vendor quotations</p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div>
            <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/40 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/50 transition-all duration-200"
              placeholder="e.g. officer@vendorbridge.com"
              required
            />
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-semibold text-[#8C9A93] mb-1.5 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0B0F0E] border border-[#223027] rounded-lg px-4 py-2.5 text-sm text-[#E8EDEA] placeholder-[#8C9A93]/40 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/50 transition-all duration-200"
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
        <div className="mt-6 p-3 bg-[#16211d] border border-[#223027] rounded-lg text-[11px] text-[#8C9A93] space-y-1">
          <p className="font-semibold text-[#22C55E]">Try out these seeded credentials:</p>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div><span className="font-medium text-[#E8EDEA]">Officer:</span> officer@vendorbridge.com</div>
            <div><span className="font-medium text-[#E8EDEA]">Manager:</span> priya@vendorbridge.com</div>
            <div><span className="font-medium text-[#E8EDEA]">Vendor 1:</span> vendor1@acme.com</div>
            <div><span className="font-medium text-[#E8EDEA]">Vendor 2:</span> vendor2@globaltech.com</div>
          </div>
          <p className="text-[9px] pt-1 border-t border-[#223027] text-center">Password for all is <code className="text-[#22C55E]">password123</code></p>
        </div>

        {/* Register Redirect */}
        <div className="mt-6 text-center text-xs text-[#8C9A93]">
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
