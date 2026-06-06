import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { LogOut, Bell, Check, User } from 'lucide-react';
import api from '../lib/api';

const Topbar = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle outside clicks to close notifications dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="h-16 bg-[#121A17] border-b border-[#223027] flex items-center justify-between px-8 z-10">
      {/* Title */}
      <div>
        <h1 className="text-lg font-semibold text-[#E8EDEA]">
          Workspace ERP
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-6">
        
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 text-[#8C9A93] hover:text-[#E8EDEA] hover:bg-[#16211d] rounded-lg transition-all relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-[#22C55E] text-[10px] font-bold text-black flex items-center justify-center rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-[#121A17] border border-[#223027] rounded-lg shadow-xl overflow-hidden z-20">
              <div className="p-3 border-b border-[#223027] flex justify-between items-center bg-[#0F1513]">
                <span className="text-xs font-semibold text-[#E8EDEA]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-[#1a2d24] text-[#22C55E] px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[#223027]">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#8C9A93]">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 text-xs transition-colors hover:bg-[#16211d] flex gap-2 justify-between items-start ${
                        !notif.is_read ? 'bg-[#14231b]/30' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <p className={`text-[#E8EDEA] ${!notif.is_read ? 'font-medium' : ''}`}>
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-[#8C9A93] block mt-1">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                      {!notif.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="p-1 text-[#22C55E] hover:bg-[#1a2d24] rounded"
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-[#223027]"></div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <span className="block text-sm font-medium text-[#E8EDEA]">
              {user?.first_name} {user?.last_name || ''}
            </span>
            <span className="block text-xs text-[#8C9A93] capitalize">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#ef4444] hover:bg-[#2d1212]/30 hover:text-[#f87171] border border-transparent hover:border-[#ef4444]/40 rounded-lg transition-all"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

      </div>
    </header>
  );
};

export default Topbar;
