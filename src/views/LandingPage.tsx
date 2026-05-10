import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [director, setDirector] = useState('');
  const navigate = useNavigate();

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!projectName || !director) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ 
          title: projectName, 
          director,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setIsModalOpen(false);
        navigate(`/projects/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center pt-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="w-20 h-20 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center mb-12 shadow-2xl relative group"
      >
        <div className="absolute inset-0 bg-brand-cyan/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <Film className="w-8 h-8 text-brand-cyan relative z-10" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="text-7xl md:text-[100px] font-semibold tracking-tight mb-8 leading-[0.9] text-white"
      >
        Lazy making shotlist?<br />
        <span className="text-brand-yellow">Just Shytlist!</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 1 }}
        className="text-zinc-400 max-w-xl text-lg mb-16 font-medium leading-relaxed"
      >
        Shotlist builder for Director of Photography
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        onClick={() => setIsModalOpen(true)}
        className="btn-primary py-5 px-16 text-base font-semibold shadow-xl shadow-brand-cyan/10 hover:shadow-brand-cyan/20 rounded-xl"
      >
        <Plus className="w-5 h-5 -ml-2" />
        Create Project
      </motion.button>

      {/* Modal */}
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
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 p-12 rounded-3xl shadow-3xl overflow-hidden"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors"
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
                    placeholder="e.g. THE NEON VELVET"
                    className="input-field"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <label className="label-micro text-left block">Director</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Greta Gerwig"
                    className="input-field"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-5 mt-6 font-semibold rounded-xl text-base">
                  Create Project
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
