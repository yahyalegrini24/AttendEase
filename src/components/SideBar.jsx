/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, Table, List, User, LogOut, FileUp, Edit } from 'lucide-react';
import { supabase } from '../utils/Supabase';
import { useAuth } from '../hooks/useAuth';

export default function Sidebar() {
  const { user } = useAuth();
  const userId = user?.teacherId;
  const [open, setOpen] = useState(true);
  const [activeHover, setActiveHover] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setOpen(false);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Logout failed. Please try again.');
    }
  };

  const navItems = [
    { to: `/user/${userId}`, label: 'Sessions', icon: Home },
    { to: `/user/${userId}/time-table`, label: 'TimeTable', icon: Table },
    { to: `/user/${userId}/students-lists`, label: 'Students Lists', icon: List },
    { to: `/user/${userId}/export-page`, label: 'Export Lists', icon: FileUp },
    { to: `/user/${userId}/edit-session`, label: 'Edit Sessions', icon: Edit },
    { to: `/user/${userId}/profile`, label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && open && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={`transition-all duration-300 ease-in-out rounded-4xl ${
          open ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'
        } bg-gradient-to-b from-[#006633] to-[#004d26] text-white h-screen flex flex-col border-r border-white/10 fixed md:relative z-30`}
      >
        {/* App Logo/Name */}
        <div className="flex items-center justify-between px-5 py-6 border-b border-white/10 rounded-t-2xl">
          {open ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-2xl flex items-center justify-center shadow-md">
                <span className="text-[#006633] font-bold text-lg">AE</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">AttendEase</h1>
            </div>
          ) : (
            <div className="w-9 h-9 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <span className="text-[#006633] font-bold text-lg">AE</span>
            </div>
          )}
          <button
            onClick={() => setOpen(!open)}
            className={`text-white hover:bg-white/10 rounded-full p-1.5 transition-all ${
              !open ? 'absolute -right-3 top-7 bg-[#006633] border-2 border-white shadow-lg' : ''
            }`}
            aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {open ? (
              <ChevronLeft size={20} className="transition-transform hover:scale-110" />
            ) : (
              <ChevronRight size={20} className="transition-transform hover:scale-110" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex flex-col space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 relative overflow-hidden group
                ${
                  location.pathname === to
                    ? 'bg-white/15 backdrop-blur-sm shadow-inner'
                    : 'hover:bg-white/10'
                }
                ${!open ? 'justify-center' : ''}
              `}
              title={!open ? label : ''}
              onMouseEnter={() => setActiveHover(label)}
              onMouseLeave={() => setActiveHover(null)}
              onClick={() => isMobile && setOpen(false)}
            >
              <div className="relative">
                <Icon
                  size={22}
                  className={`transition-transform ${
                    activeHover === label ? 'scale-110' : 'scale-100'
                  } ${location.pathname === to ? 'text-white' : 'text-white/90'}`}
                />
                {location.pathname === to && (
                  <span className="absolute -left-2.5 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-full shadow-sm"></span>
                )}
              </div>
              {open && (
                <span
                  className={`text-sm font-medium transition-all ${
                    location.pathname === to ? 'text-white' : 'text-white/90'
                  }`}
                >
                  {label}
                </span>
              )}
              {!open && activeHover === label && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-white text-[#006633] text-sm font-medium rounded-lg shadow-xl whitespace-nowrap z-10">
                  {label}
                </div>
              )}
            </Link>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="mt-auto border-t border-white/10 pt-3 pb-5 px-3 rounded-b-2xl">
          <div
            className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
              !open ? 'justify-center' : 'hover:bg-white/10'
            } cursor-pointer`}
            onClick={() => {
              if (isMobile) setOpen(false);
              navigate(`/user/${userId}/profile`);
            }}
          >
            <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center shadow-inner">
              <span className="text-sm font-medium text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            {open && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">
                  {user?.name || 'User Name'}
                </p>
                <p className="text-xs text-white/70 truncate">
                  {user?.email || 'admin@attendease.com'}
                </p>
              </div>
            )}
            {open && (
              <button 
                className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Logout"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Button */}
      {isMobile && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#006633] rounded-full flex items-center justify-center shadow-xl z-20 border-2 border-white"
          aria-label="Open menu"
        >
          <ChevronRight size={24} className="text-white" />
        </button>
      )}
    </>
  );
}
