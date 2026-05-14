import { useState, useEffect, MouseEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash, ArrowUpRight, FilmSlate, User, Calendar, X, CircleNotch } from '@phosphor-icons/react';
import { Project } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';

const springConfig = { type: "spring", stiffness: 100, damping: 20 };

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [director, setDirector] = useState('');
  const [dp, setDp] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          shots (count)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectName || !director || !dp || !user) return;

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
        setProjects([data, ...projects]);
        setIsModalOpen(false);
        setProjectName('');
        setDirector('');
        setDp('');
        toast.success('Project created successfully');
        navigate(`/projects/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const deleteProject = async (id: string, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Delete this project and all its shotlists?')) {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setProjects(projects.filter((p) => p.id !== id));
        toast.success('Project deleted');
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error('Failed to delete project');
      }
    }
  };

  return (
    <div className="space-y-16 py-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-12">
        <div>
          <h1 className="text-5xl font-semibold tracking-tighter text-white mb-3 leading-none">Projects</h1>
          <p className="text-zinc-500 font-medium text-base">Manage your active shotlists.</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={springConfig}
          onClick={() => setIsModalOpen(true)}
          className="px-8 py-3 bg-brand-yellow text-black font-semibold rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 text-sm tracking-tight shadow-[0_0_30px_-10px_var(--color-brand-yellow)] group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          <Plus className="w-5 h-5 -ml-1 relative z-10" />
          <span className="relative z-10">New Project</span>
        </motion.button>
      </div>

      {isLoading ? (
        <div className="py-32 text-center flex flex-col items-center justify-center">
          <CircleNotch className="w-10 h-10 text-brand-cyan mb-6 animate-spin" />
          <div className="w-32 h-1 bg-zinc-900 rounded-full overflow-hidden">
             <div className="h-full bg-brand-cyan animate-[shimmer_1.5s_infinite] w-1/2"></div>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={springConfig}
           className="py-32 text-center rounded-[2.5rem] glass"
        >
          <motion.div 
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center justify-center mx-auto mb-6 shadow-inner"
          >
            <FilmSlate className="w-8 h-8 text-zinc-600" />
          </motion.div>
          <h3 className="text-zinc-300 font-semibold text-xl tracking-tight">No active projects</h3>
          <p className="text-zinc-500 mt-2 max-w-sm mx-auto">You don't have any shotlists yet. Create your first project to start planning your shoot.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatePresence>
            {projects.map((project, index) => {
              const isLargeCard = index % 3 === 0;
              return (
                <motion.div
                  layout
                  key={project.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ delay: index * 0.05, ...springConfig }}
                  className={isLargeCard ? "md:col-span-2" : "md:col-span-1"}
                >
                  <div className="relative group block glass p-8 rounded-[2rem] hover:bg-zinc-900/80 transition-all hover:border-white/10 h-full overflow-hidden">
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/0 to-brand-cyan/0 group-hover:from-brand-cyan/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />
                    
                    <div className="flex justify-between items-start mb-12 relative z-20">
                      <div className="w-14 h-14 bg-zinc-950 border border-white/5 rounded-2xl flex items-center justify-center group-hover:bg-brand-cyan group-hover:border-brand-cyan/50 transition-all duration-500 shadow-inner">
                        <FilmSlate className="w-6 h-6 text-zinc-500 group-hover:text-black transition-colors duration-500" />
                      </div>
                      <button
                        onClick={(e) => deleteProject(project.id, e)}
                        className="p-3 bg-zinc-950/50 rounded-xl border border-transparent text-zinc-600 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-all z-30"
                        title="Delete Project"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>

                    <Link 
                       to={`/projects/${project.id}`}
                       className="absolute inset-0 z-10"
                       aria-label={`Open ${project.title}`}
                    />

                    <div className="relative z-20 pointer-events-none flex flex-col justify-between h-[calc(100%-6.5rem)]">
                      <div>
                        <h3 className={`font-semibold mb-6 text-white tracking-tighter group-hover:text-brand-cyan transition-colors ${isLargeCard ? 'text-4xl' : 'text-2xl'}`}>
                          {project.title}
                        </h3>

                        <div className={`grid gap-4 ${isLargeCard ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          <div className="flex items-center gap-3 text-zinc-400 text-sm font-medium">
                            <div className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-white/5 flex items-center justify-center"><User className="w-4 h-4 text-zinc-500" /></div>
                            <span className="flex flex-col"><span className="text-[10px] uppercase tracking-widest text-zinc-600">Dir</span> {project.director}</span>
                          </div>
                          <div className="flex items-center gap-3 text-zinc-400 text-sm font-medium">
                            <div className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-white/5 flex items-center justify-center"><FilmSlate className="w-4 h-4 text-zinc-500" /></div>
                            <span className="flex flex-col"><span className="text-[10px] uppercase tracking-widest text-zinc-600">DP</span> {project.dp}</span>
                          </div>
                          <div className="flex items-center gap-3 text-zinc-400 text-sm font-medium">
                            <div className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-white/5 flex items-center justify-center"><Calendar className="w-4 h-4 text-zinc-500" /></div>
                            <span className="flex flex-col"><span className="text-[10px] uppercase tracking-widest text-zinc-600">Created</span> {project.created_at ? new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-end justify-between border-t border-white/5 pt-6 mt-8">
                        <div className="flex items-center gap-3">
                          <span className="text-brand-yellow font-mono text-2xl tracking-tighter">
                            {String((project as any).shots?.[0]?.count || 0).padStart(2, '0')}
                          </span>
                          <span className="text-xs font-semibold text-zinc-600 uppercase tracking-widest">Shots</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 font-semibold text-xs uppercase tracking-widest group-hover:text-brand-cyan transition-all">
                          Open
                          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={springConfig}
              className="relative w-full max-w-lg glass p-12 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-10 text-left">
                <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Create Project</h2>
                <p className="text-zinc-500 text-sm">Enter project details.</p>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-8">
                <div className="space-y-3">
                  <label className="label-micro text-left block font-medium">Project Title</label>
                  <input
                    autoFocus
                    required
                    type="text"
                    placeholder="e.g. THE NEON VELVET"
                    className="input-field bg-black/50"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <label className="label-micro text-left block font-medium">Director</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Greta Gerwig"
                    className="input-field bg-black/50"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <label className="label-micro text-left block font-medium">Director of Photography</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Roger Deakins"
                    className="input-field bg-black/50"
                    value={dp}
                    onChange={(e) => setDp(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-5 mt-6 font-semibold rounded-xl text-base shadow-lg shadow-brand-cyan/20">
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
