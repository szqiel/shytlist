import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SquaresFour, Envelope, SignOut, CaretDown } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import Logo from './Logo';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { name: 'Dashboard', path: '/projects', icon: SquaresFour },
    { name: 'Contact', path: '/contact', icon: Envelope },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  useEffect(() => {
    setShowUserMenu(false);
  }, [location]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (email: string | undefined) => {
    if (!email) return '??';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-bg relative overflow-x-hidden flex flex-col">
      {/* Background Effect */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      {/* Navigation */}
      <nav className="h-20 bg-nav/80 backdrop-blur-md border-b border-white/5 px-8 flex items-center justify-between z-50 sticky top-0">
        <Link to="/" className="flex items-center gap-3 group">
          <Logo size="md" className="transition-all duration-300 group-hover:scale-105" />
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight text-white leading-none">Shyt<span className="text-brand-cyan">list</span></span>
          </div>
        </Link>

        <div className="flex items-center gap-3 md:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 text-sm font-medium transition-all px-3 py-2 rounded-lg ${
                location.pathname === item.path 
                  ? 'text-brand-cyan bg-brand-cyan/10' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="hidden md:flex font-medium">{item.name}</span>
            </Link>
          ))}
          <div className="h-8 w-px bg-white/5 ml-2 hidden md:block"></div>
          
          {user ? (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl border border-brand-cyan/30 bg-zinc-900 flex items-center justify-center transition-all group-hover:border-brand-cyan">
                   <span className="text-xs font-semibold text-zinc-100 uppercase">{getInitials(user.email)}</span>
                </div>
                <CaretDown weight="bold" className={`w-3 h-3 text-zinc-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/5 rounded-xl shadow-2xl p-2 z-[60]"
                  >
                    <div className="px-3 py-2 border-b border-white/5 mb-1">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Account</p>
                      <p className="text-xs text-zinc-300 truncate font-medium">{user.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <SignOut className="w-4 h-4" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link 
              to="/auth" 
              className="text-sm font-medium text-brand-cyan hover:text-cyan-300 transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <main className={`flex-1 relative z-10 w-full ${location.pathname.match(/^\/projects\/.+/) ? 'p-2 md:p-4' : 'px-6 md:px-12 py-12 max-w-7xl mx-auto'}`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 py-16 px-6 md:px-12 text-center relative z-10">
        <p className="text-zinc-600 text-sm font-medium uppercase tracking-widest flex items-center justify-center gap-3">
          <span className="w-8 h-px bg-white/5"></span>
          © {new Date().getFullYear()} szqiel
          <span className="w-8 h-px bg-white/5"></span>
        </p>
        <p className="text-zinc-700 text-[10px] mt-4 font-medium uppercase tracking-[0.2em]">
          Built for Director of Photography
        </p>
      </footer>
    </div>
  );
}
