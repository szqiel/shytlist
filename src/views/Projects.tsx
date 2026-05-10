import { useState, useEffect, MouseEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowUpRight, Film, User, Calendar, X, Loader2 } from 'lucide-react';
import { Project } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [director, setDirector] = useState('');
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
      alert('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectName || !director || !user) return;

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
        setProjects([data, ...projects]);
        setIsModalOpen(false);
        setProjectName('');
        setDirector('');
        navigate(`/projects/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
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
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project');
      }
    }
  };

  return (
    <div className="space-y-16 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-12">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-white mb-3">Projects</h1>
          <p className="text-zinc-500 font-medium text-base">Manage your shotlists.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-8 py-2.5 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-yellow-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm tracking-tight shadow-lg shadow-brand-yellow/10 hover:shadow-brand-yellow/20"
        >
          <Plus className="w-5 h-5 -ml-1" />
          <span>New Project</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-32 text-center">
          <Loader2 className="w-12 h-12 text-brand-cyan mx-auto mb-6 animate-spin" />
          <p className="text-zinc-500 font-medium">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-32 text-center rounded-3xl border border-white/5 bg-zinc-900/30 backdrop-blur-sm">
          <Film className="w-12 h-12 text-zinc-700 mx-auto mb-6" />
          <h3 className="text-zinc-400 font-semibold text-lg">No active projects</h3>
          <p className="text-zinc-600 mt-2">Start by creating your first cinematic sequence.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="relative group block bg-zinc-900/50 backdrop-blur-sm border border-white/5 p-8 rounded-3xl hover:bg-zinc-900 transition-all hover:border-white/10 h-full shadow-lg">
                <div className="flex justify-between items-start mb-12 relative z-20">
                  <div className="w-12 h-12 bg-zinc-800 border border-white/5 rounded-xl flex items-center justify-center group-hover:bg-brand-cyan group-hover:border-brand-cyan transition-all duration-300">
                    <Film className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors" />
                  </div>
                  <button
                    onClick={(e) => deleteProject(project.id, e)}
                    className="p-2 text-zinc-700 hover:text-red-500 transition-colors z-30"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Link 
                   to={`/projects/${project.id}`}
                   className="absolute inset-0 z-10"
                   aria-label={`Open ${project.title}`}
                />

                <div className="relative z-20 cursor-pointer pointer-events-none">
                  <h3 className="text-2xl font-semibold mb-6 text-white tracking-tight group-hover:text-brand-cyan transition-colors">
                    {project.title}
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-zinc-500 text-sm font-medium">
                      <User className="w-4 h-4 text-zinc-600" />
                      <span>Dir. {project.director}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-500 text-sm font-medium">
                      <Calendar className="w-4 h-4 text-zinc-600" />
                      <span>{project.created_at ? new Date(project.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-500 border-t border-white/5 pt-6 mt-6">
                      <span className="text-brand-yellow font-semibold text-lg">
                        {(project as any).shots?.[0]?.count || 0}
                      </span>
                      <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Shots</span>
                    </div>
                  </div>

                  <div className="mt-12 flex items-center gap-2 text-zinc-500 font-semibold text-xs uppercase tracking-widest group-hover:text-brand-cyan transition-all">
                    Open Project
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
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
                    className="input-field"
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
