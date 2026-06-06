import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../utility/context/AuthContext';
import navigation from '../../navigation/vertical';
import { ShieldCheck, X } from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, hasRole } = useAuth();

  return (
    <aside className={`w-64 bg-[#121A17] border-r border-[#223027] flex flex-col min-h-screen fixed md:relative inset-y-0 left-0 z-30 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
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
          className="p-1 rounded-lg text-[#8C9A93] hover:text-[#E8EDEA] hover:bg-[#16211d] md:hidden cursor-pointer"
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
                    : 'text-[#8C9A93] hover:text-[#E8EDEA] hover:bg-[#16211d]'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / User Profile Summary */}
      <div className="p-4 border-t border-[#223027] bg-[#0F1513]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#1b3d2b] border border-[#22C55E] flex items-center justify-center text-xs font-bold text-[#22C55E]">
            {user?.first_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#E8EDEA] truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-[#8C9A93] capitalize truncate">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
