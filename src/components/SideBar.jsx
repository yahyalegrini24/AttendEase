import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, Users, LogOut } from 'lucide-react';

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const [activeHover, setActiveHover] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/users', label: 'Attendance', icon: Users },
  ];

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        open ? 'w-64' : 'w-20'
      } bg-gradient-to-b from-[#006633] to-[#004d26] text-white h-screen flex flex-col border-r border-white/10 relative isolate`}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-[#008040]/10 blur-xl"></div>
        <div className="absolute -left-10 bottom-1/4 w-48 h-48 rounded-full bg-[#008040]/10 blur-xl"></div>
      </div>

      {/* App Logo/Name */}
      <div className="flex items-center justify-between px-5 py-6 border-b border-white/10">
        {open ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-md">
              <span className="text-[#006633] font-bold text-lg">AE</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">AttendEase</h1>
          </div>
        ) : (
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center mx-auto shadow-md">
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
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden group
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
      <div className="mt-auto border-t border-white/10 pt-3 pb-5 px-3">
        <div
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            !open ? 'justify-center' : 'hover:bg-white/10'
          } cursor-pointer`}
        >
          <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center shadow-inner">
            <span className="text-sm font-medium text-white">U</span>
          </div>
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">User Name</p>
              <p className="text-xs text-white/70 truncate">admin@attendease.com</p>
            </div>
          )}
          {open && (
            <button 
              className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className={`p-3 text-center text-xs text-white/70 border-t border-white/10 transition-all ${
          !open ? 'opacity-0' : 'opacity-100'
        }`}
      >
        © {new Date().getFullYear()} AttendEase v1.0
      </div>

      {/* Mobile overlay when open */}
      {isMobile && open && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}