import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import navigation from '../../navigation/vertical';
import { ShieldCheck, X } from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { hasRole } = useAuth();

  return (
    <aside className={`w-64 bg-[#0B0F0E] border-r border-[#223027] flex flex-col min-h-screen fixed md:relative inset-y-0 left-0 z-30 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-[#223027]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-[#22C55E]" />
          <span className="font-semibold text-lg tracking-wider text-[#E8EDEA]">
            Vendor<span className="text-[#22C55E]">Bridge</span>
          </span>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-lg text-[#94A3B8] hover:text-[#E8EDEA] hover:bg-[#16211d] md:hidden cursor-pointer"
          aria-label="Close Sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (item.roles && !hasRole(item.roles)) {
            return null;
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#1a2d24] text-[#22C55E] border-l-4 border-[#22C55E] pl-3'
                    : 'text-[#94A3B8] hover:text-[#E8EDEA] hover:bg-[#16211d]'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

    </aside>
  );
};

export default Sidebar;
