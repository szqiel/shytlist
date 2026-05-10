import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, LayoutDashboard, Mail, Github } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/projects', icon: LayoutDashboard },
    { name: 'Contact', path: '/contact', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-bg relative overflow-x-hidden flex flex-col">
      {/* Background Effect */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      {/* Navigation */}
      <nav className="h-20 bg-nav/80 backdrop-blur-md border-b border-white/5 px-8 flex items-center justify-between z-50 sticky top-0">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-zinc-900 border border-white/10 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:border-brand-cyan/50">
            <Camera className="w-5 h-5 text-zinc-400 group-hover:text-brand-cyan transition-colors" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight text-white leading-none">Shyt<span className="text-brand-cyan">list</span></span>
            <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Lazy Shotlist Builder</span>
          </div>
        </Link>

        <div className="flex items-center gap-6">
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
              <span className="hidden md:inline font-medium">{item.name}</span>
            </Link>
          ))}
          <div className="h-8 w-px bg-white/5 ml-2 hidden md:block"></div>
          <div className="w-10 h-10 rounded-xl border border-brand-cyan/30 bg-zinc-900 flex items-center justify-center ml-2">
             <span className="text-xs font-semibold text-zinc-100 uppercase">SZ</span>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="flex-1 relative z-10 px-6 md:px-12 py-12 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
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
