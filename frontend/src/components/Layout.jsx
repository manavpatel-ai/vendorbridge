import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Loader2 } from 'lucide-react';

const Layout = () => {
  const { isAuthenticated, loading } = useAuth();

  // Show fullscreen dark green loading spinner while checking auth status
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0B0F0E] flex flex-col items-center justify-center gap-4 text-[#E8EDEA]">
        <Loader2 className="h-10 w-10 text-[#22C55E] animate-spin" />
        <span className="text-sm font-medium tracking-wide text-[#8C9A93]">Loading VendorBridge...</span>
      </div>
    );
  }

  // Redirect to login if user session is invalid or expired
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-[#0B0F0E] text-[#E8EDEA] overflow-hidden">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar controls */}
        <Topbar />

        {/* Dynamic Inner Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#0B0F0E]">
          <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
