import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../utility/context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ChatBot from '../views/Chat/ChatBot';
import { Loader2 } from 'lucide-react';

const VerticalLayout = () => {
  // Unconditional Hooks at the top
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

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
    <div className="flex h-screen bg-[#0B0F0E] text-[#E8EDEA] overflow-hidden relative">
      {/* Sidebar Backdrop Overlay on Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar controls */}
        <Topbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

        {/* Dynamic Inner Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#0B0F0E]">
          <div className="w-full space-y-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* AI ChatBot Widget */}
      <ChatBot />
    </div>
  );
};

export default VerticalLayout;
