import { useState, FormEvent, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X } from '@phosphor-icons/react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Logo from '../components/Logo';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const hasAuthParams = 
      window.location.hash.includes('access_token') || 
      window.location.search.includes('code') || 
      window.location.hash.includes('error');

    if (user && !loading && hasAuthParams) {
      navigate('/projects');
    }
  }, [user, loading, navigate]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [director, setDirector] = useState('');
  const [dp, setDp] = useState('');

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!projectName || !director || !dp) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ 
          title: projectName, 
          director,
          dp,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setIsModalOpen(false);
        setProjectName('');
        setDirector('');
        setDp('');
        navigate(`/projects/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  return (
    <>
      <Helmet>
        <title>Shytlist | The Fastest Shotlist Tool for Filmmakers & DPs</title>
        <meta name="description" content="Lazy making shotlists? Just Shytlist. The modern, frictionless, and dark-mode optimized shotlist creator designed for indie filmmakers and agile commercial workflows. Ditch the spreadsheets." />
        <link rel="canonical" href="https://shytlist.vercel.app/" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://shytlist.vercel.app/" />
        <meta property="og:title" content="Shytlist | The Fastest Shotlist Tool for Filmmakers & DPs" />
        <meta property="og:description" content="Lazy making shotlists? Just Shytlist. The modern, frictionless, and dark-mode optimized shotlist creator designed for indie filmmakers and agile commercial workflows." />
        <meta property="og:image" content="https://shytlist.vercel.app/logo.svg" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://shytlist.vercel.app/" />
        <meta name="twitter:title" content="Shytlist | The Fastest Shotlist Tool for Filmmakers & DPs" />
        <meta name="twitter:description" content="Lazy making shotlists? Just Shytlist. The modern, frictionless, and dark-mode optimized shotlist creator designed for indie filmmakers and agile commercial workflows." />
        <meta name="twitter:image" content="https://shytlist.vercel.app/logo.svg" />
      </Helmet>
      <div className="flex flex-col md:flex-row items-center justify-between min-h-[75dvh] py-24 md:py-32 gap-16 md:gap-8 max-w-7xl mx-auto w-full relative z-10">
      
      {/* Left Content */}
      <div className="flex-1 w-full max-w-2xl text-left relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="mb-8"
        >
          <h1 className="text-6xl md:text-[80px] lg:text-[100px] font-semibold tracking-tighter mb-6 leading-[0.85] text-white">
            Lazy making<br />
            shotlist?<br />
            <span className="text-brand-yellow block mt-4">Just Shytlist!</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 1 }}
          className="text-zinc-400 text-lg max-w-[45ch] mb-12 font-medium leading-relaxed"
        >
          Shotlist tool designed specifically for Directors of Photography and filmmakers who demand speed and perfection.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ 
            delay: 0.4, 
            type: "spring", stiffness: 100, damping: 20
          }}
          onClick={() => setIsModalOpen(true)}
          className="pl-8 pr-3 py-3 bg-brand-cyan text-black font-semibold rounded-full hover:bg-cyan-400 active:scale-[0.98] flex items-center justify-center gap-4 text-base tracking-tight shadow-[0_0_30px_-5px_rgba(55,202,255,0.35)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group relative overflow-hidden"
        >
          <span className="relative z-10 font-bold">Create Project</span>
          <div className="w-9 h-9 rounded-full bg-black/10 flex items-center justify-center relative z-10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105 group-hover:rotate-90">
            <Plus weight="bold" className="w-4 h-4" />
          </div>
        </motion.button>
      </div>

      {/* Right Content - Abstract Hero Asset */}
      <div className="flex-1 w-full flex justify-center md:justify-end relative h-[360px] md:h-[500px] -mt-20 md:mt-0">
        <motion.div
          animate={{ 
            y: [-10, 10, -10],
            rotate: [-1, 1, -1]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative w-full max-w-md h-full"
        >
          {/* Main Card - Outer Doppelrand Shell */}
          <div className="absolute top-[35%] md:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] sm:w-[340px] max-w-[340px] h-[410px] doppelrand-shell p-2 z-20 opacity-40 md:opacity-100">
            {/* Inner Doppelrand Core */}
            <div className="w-full h-full doppelrand-core p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-inner">
                  <Logo size="sm" />
                </div>
                <div className="space-y-2">
                  <div className="w-32 h-2.5 bg-zinc-800 rounded-full"></div>
                  <div className="w-20 h-2 bg-zinc-800/40 rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-full h-[52px] bg-zinc-900/60 rounded-[14px] border border-white/5 flex items-center px-3 relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" style={{ animationDelay: `${i * 0.2}s` }} />
                     <div className="w-7 h-7 rounded-[8px] bg-zinc-850 flex items-center justify-center mr-3 shadow-inner border border-white/5">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan/20 border border-brand-cyan/50"></div>
                     </div>
                     <div className="flex-1 space-y-2">
                       <div className="w-1/2 h-1.5 bg-zinc-700/80 rounded-full"></div>
                       <div className="w-1/3 h-1 bg-zinc-800/60 rounded-full"></div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Decorative Layers */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full border-dashed opacity-50 pointer-events-none"
          />
          <div className="absolute top-1/4 -right-12 w-64 h-64 bg-brand-cyan/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-1/4 -left-12 w-64 h-64 bg-brand-yellow/10 blur-[120px] rounded-full pointer-events-none" />
        </motion.div>
      </div>

      {/* Modal */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-bg/90 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full max-w-lg glass border border-white/10 p-6 md:p-12 rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-6 right-6 p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-10 text-left">
                  <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Create Shotlist</h2>
                  <p className="text-zinc-500 text-sm">Enter project details.</p>
                </div>

                <form onSubmit={handleCreateProject} className="space-y-8">
                  <div className="space-y-3">
                    <label className="label-micro text-left block">Project Title</label>
                    <input
                      autoFocus
                      required
                      type="text"
                      placeholder="e.g. The Iron Lung"
                      className="input-field bg-black/50"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="label-micro text-left block">Director</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Syair Adharian"
                      className="input-field bg-black/50"
                      value={director}
                      onChange={(e) => setDirector(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="label-micro text-left block">Director of Photography</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Arga Yura"
                      className="input-field bg-black/50"
                      value={dp}
                      onChange={(e) => setDp(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full py-5 mt-6 font-semibold rounded-xl text-base shadow-lg shadow-brand-cyan/20 cursor-pointer">
                    Create Shotlist
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
    </>
  );
}
