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
    <div className={`min-h-[100dvh] ${location.pathname.match(/^\/projects\/.+/) ? 'h-[100dvh] overflow-hidden' : ''} bg-bg relative overflow-x-hidden flex flex-col`}>
      {/* Background Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.015] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      {/* Ambient Breathing Background Mesh Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-20%] w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] md:top-[-25%] md:left-[-15%] md:w-[60vw] md:h-[60vw] rounded-full bg-brand-cyan/20 md:bg-brand-cyan/8 blur-[60px] sm:blur-[100px] md:blur-[140px] animate-float-cyan"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] md:bottom-[-25%] md:right-[-15%] md:w-[60vw] md:h-[60vw] rounded-full bg-brand-yellow/12 md:bg-brand-yellow/4 blur-[60px] sm:blur-[100px] md:blur-[140px] animate-float-yellow"></div>
      </div>

      {/* Navigation Floating Capsule */}
      <div className="sticky top-4 z-50 w-full px-4 md:px-0 mb-4 md:mb-6">
        <nav className="mx-auto w-full max-w-5xl bg-zinc-950/60 backdrop-blur-xl border border-white/10 px-6 py-2.5 rounded-full flex items-center justify-between shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
          <Link to="/" className="flex items-center gap-3 group">
            <Logo size="md" className="transition-all duration-300 group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight text-white leading-none">Shyt<span className="text-brand-cyan">list</span></span>
            </div>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] px-4 py-2 rounded-full ${
                  location.pathname === item.path 
                    ? 'text-brand-cyan bg-brand-cyan/10' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden md:flex font-semibold">{item.name}</span>
              </Link>
            ))}
            <div className="h-6 w-px bg-white/10 ml-2 hidden md:block"></div>
            
            {user ? (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full border border-brand-cyan/30 bg-zinc-900 flex items-center justify-center transition-all duration-300 group-hover:border-brand-cyan">
                     <span className="text-xs font-semibold text-zinc-100 uppercase">{getInitials(user.email)}</span>
                  </div>
                  <CaretDown weight="bold" className={`w-3 h-3 text-zinc-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      style={{ transformOrigin: 'top right' }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      className="absolute right-0 mt-3 w-48 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] backdrop-blur-xl"
                    >
                      <div className="px-3 py-2 border-b border-white/5 mb-1">
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Account</p>
                        <p className="text-xs text-zinc-300 truncate font-semibold">{user.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors duration-200"
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
                className="text-sm font-semibold text-brand-cyan hover:text-cyan-300 transition-colors duration-300 px-3 py-1.5"
              >
                Login
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* Page Content */}
      <main className={`flex-1 relative z-10 w-full min-h-0 ${location.pathname.match(/^\/projects\/.+/) ? 'pt-2 px-3 pb-3 md:pt-4 md:px-4 md:pb-4 flex flex-col overflow-hidden' : 'px-6 md:px-12 py-16 max-w-7xl mx-auto'}`}>
        {children}
      </main>

      {/* Footer */}
      {!location.pathname.match(/^\/projects\/.+/) && (
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
      )}
    </div>
  );
}
