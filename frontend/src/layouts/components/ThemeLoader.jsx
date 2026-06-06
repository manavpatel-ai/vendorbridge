import React from 'react';
import { ShieldCheck } from 'lucide-react';

const getSavedTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem('theme') || 'dark';
};

const ThemeLoader = ({ label = 'Loading...' }) => {
  const isLight = getSavedTheme() === 'light';

  return (
    <div
      className={`h-screen w-screen relative overflow-hidden flex items-center justify-center px-6 ${
        isLight ? 'bg-[#F8FAFC] text-[#0F172A]' : 'bg-[#0B0F0E] text-[#E8EDEA]'
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${isLight ? 'bg-slate-200' : 'bg-[#16211d]'}`}>
        <div className="h-full w-2/3 bg-[#22C55E] animate-pulse shadow-[0_0_24px_rgba(34,197,94,0.45)]" />
      </div>

      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#22C55E]/10 blur-3xl" />
      <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-[#22C55E]/5 blur-3xl" />

      <div
        className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
          isLight
            ? 'bg-white/95 border-slate-200 shadow-slate-900/10'
            : 'bg-[#0F1513]/95 border-[#223027] shadow-black/40'
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-3xl bg-[#22C55E]/10 border border-[#22C55E]/30" />
            <div className="absolute inset-0 rounded-3xl border-4 border-transparent border-t-[#22C55E] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShieldCheck className="h-10 w-10 text-[#22C55E]" />
            </div>
          </div>

          <div className="mt-5 text-3xl font-extrabold tracking-tight">
            Vendor<span className="text-[#22C55E]">Bridge</span>
          </div>
          <div className={`mt-3 flex items-center gap-2 text-sm font-medium ${isLight ? 'text-slate-500' : 'text-[#94A3B8]'}`}>
            <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-ping" />
            <span>{label}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeLoader;
