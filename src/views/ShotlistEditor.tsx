import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Download, 
  GripVertical, 
  ArrowLeft, 
  Save,
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  Film
} from 'lucide-react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult 
} from '@hello-pangea/dnd';

const DraggableAny = Draggable as any;
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useMemo } from 'react';
import { Project, Shot } from '../types';
import { supabase } from '../lib/supabase';

const calculateShotDuration = (shot: Shot): number => {
  let baseTime = 3;
  let sizeFactor = 0;
  let lensFactor = 0;
  let movementMultiplier = 1.0;

  const size = shot.shot_size;
  if (["Over the Shoulder", "Two Shot"].includes(size)) sizeFactor = 5;
  else if (["Extreme Wide Shot", "Wide Shot", "Full Shot", "Group Shot", "Cowboy Shot", "Medium Full Shot"].includes(size)) sizeFactor = 3;
  else if (["Medium Shot", "Medium Close Up", "Close Up", "Point of View"].includes(size)) sizeFactor = 1;
  else if (["Extreme Close Up", "Insert"].includes(size)) sizeFactor = -1;

  const lens = shot.lens;
  if (["12mm", "14mm", "16mm", "18mm", "24mm", "28mm"].includes(lens)) lensFactor = 1;

  const movement = shot.movement;
  if (movement === "Static") movementMultiplier = 1.0;
  else if (["Pan Left", "Pan Right", "Tilt Up", "Tilt Down", "Zoom In", "Zoom Out"].includes(movement)) movementMultiplier = 1.5;
  else if (["Dolly In", "Dolly Out", "Crab Left", "Crab Right", "Pedestal Up", "Pedestal Down", "Crane Up", "Crane Down"].includes(movement)) movementMultiplier = 2.0;
  else if (["Steadicam", "Handheld", "Tracking Left", "Tracking Right", "Gimbal", "Drone / Aerial"].includes(movement)) movementMultiplier = 3.0;

  return Math.round((baseTime + sizeFactor + lensFactor) * movementMultiplier);
};

const formatDuration = (totalSeconds: number): string => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const INITIAL_SHOT_STATE: Omit<Shot, 'id' | 'project_id'> = {
  shot_no: '1',
  scene_no: '1',
  shot_size: 'Close Up',
  lens: '35mm',
  movement: 'Static',
  angle: 'Eye Level',
  framing: 'Standard',
  description: '',
};

const OPTIONS = {
  no: Array.from({ length: 100 }, (_, i) => (i + 1).toString()),
  scene: Array.from({ length: 50 }, (_, i) => (i + 1).toString()),
  shot_size: [
    "Extreme Wide Shot", "Wide Shot", "Full Shot", "Cowboy Shot", 
    "Medium Full Shot", "Medium Shot", "Medium Close Up", "Close Up", 
    "Extreme Close Up", "Insert", "Over the Shoulder", "Point of View", 
    "Two Shot", "Group Shot"
  ],
  lens: [
    "12mm", "14mm", "16mm", "18mm", "24mm", "28mm", "35mm", "50mm", 
    "75mm", "85mm", "100mm", "135mm", "200mm", "Macro", "Tilt-Shift"
  ],
  movement: [
    "Static", "Pan Left", "Pan Right", "Tilt Up", "Tilt Down", 
    "Dolly In", "Dolly Out", "Tracking Left", "Tracking Right", 
    "Crab Left", "Crab Right", "Steadicam", "Handheld", "Gimbal", 
    "Crane Up", "Crane Down", "Pedestal Up", "Pedestal Down", 
    "Zoom In", "Zoom Out", "Drone / Aerial"
  ],
  angle: [
    "Eye Level", "High Angle", "Low Angle", "Dutch Angle", 
    "Top Down / Overhead", "Bird's Eye View", "Worm's Eye View", 
    "Shoulder Level", "Hip Level", "Knee Level", "Ground Level"
  ],
  framing: ['Standard', 'Wide', 'Close', 'Rule of Thirds', 'Symmetric', 'Leading Lines'],
};

export default function ShotlistEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempDirector, setTempDirector] = useState('');
  const [tempDp, setTempDp] = useState('');
  const [newShot, setNewShot] = useState<Omit<Shot, 'id' | 'project_id'>>({ ...INITIAL_SHOT_STATE });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [exportOpen, setExportOpen] = useState(false);

  const totalDuration = useMemo(() => {
    const seconds = shots.reduce((sum, shot) => sum + calculateShotDuration(shot), 0);
    return formatDuration(seconds);
  }, [shots]);

  // Load project and shots
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError || !projectData) {
          navigate('/projects');
          return;
        }

        setProject(projectData);
        setTempName(projectData.title || '');
        setTempDirector(projectData.director || '');
        setTempDp(projectData.dp || '');

        // Fetch shots
        const { data: shotsData, error: shotsError } = await supabase
          .from('shots')
          .select('*')
          .eq('project_id', id)
          .order('shot_no', { ascending: true });

        if (shotsError) throw shotsError;
        setShots(shotsData || []);

        // Set next shot number
        const nextNo = ((shotsData?.length || 0) + 1).toString();
        setNewShot(prev => ({ ...prev, shot_no: nextNo }));
      } catch (error) {
        console.error('Error loading project data:', error);
        alert('Failed to load project details');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const saveProjectInfo = async () => {
    if (!project || !tempName || !tempDirector || !tempDp) return;
    try {
      setSaveStatus('saving');
      const { error } = await supabase
        .from('projects')
        .update({ title: tempName, director: tempDirector, dp: tempDp })
        .eq('id', project.id);

      if (error) throw error;
      
      setProject({ ...project, title: tempName, director: tempDirector, dp: tempDp });
      setIsEditingInfo(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving project info:', error);
      alert('Failed to save project changes');
    }
  };

  const addShot = async (e: FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      setSaveStatus('saving');
      const { data, error } = await supabase
        .from('shots')
        .insert([{ ...newShot, project_id: project.id }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const updatedShots = [...shots, data];
        setShots(updatedShots);
        setNewShot({ 
          ...INITIAL_SHOT_STATE, 
          shot_no: (updatedShots.length + 1).toString(),
          scene_no: newShot.scene_no
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Error adding shot:', error);
      alert('Failed to add shot');
    }
  };

  const deleteShot = async (shotId: string) => {
    if (!project) return;
    try {
      setSaveStatus('saving');
      const { error } = await supabase
        .from('shots')
        .delete()
        .eq('id', shotId);

      if (error) throw error;

      // Local update and renumbering
      const updatedShots = shots.filter(s => s.id !== shotId);
      
      // Update remaining shots' numbers in database to keep them sequential
      const renumberedShots = updatedShots.map((s, idx): Shot => {
        const shot = Object.assign({}, s) as Shot;
        shot.shot_no = (idx + 1).toString();
        return shot;
      });
      
      // We'll update the local state immediately
      setShots(renumberedShots);
      
      // Optional: Batch update positions in background for perfection
      // For now, simple local count for next shot is enough
      setNewShot(prev => ({ ...prev, shot_no: (renumberedShots.length + 1).toString() }));
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error deleting shot:', error);
      alert('Failed to delete shot');
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !project) return;

    const items = Array.from(shots);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Renumber based on new order
    const finalItems = items.map((s, idx): Shot => {
      const shot = Object.assign({}, s) as Shot;
      shot.shot_no = (idx + 1).toString();
      return shot;
    });
    setShots(finalItems);

    try {
      setSaveStatus('saving');
      // Update all shots with new sequence numbers
      const updates = finalItems.map(item => supabase
        .from('shots')
        .update({ shot_no: item.shot_no })
        .eq('id', item.id)
      );
      
      await Promise.all(updates);
      
      setNewShot(prev => ({ ...prev, shot_no: (finalItems.length + 1).toString() }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving reorder:', error);
      alert('Failed to save shot order');
    }
  };

  const exportCSV = () => {
    if (!project) return;
    const headers = ['No', 'Scene', 'Shot Size', 'Lenses', 'Movement', 'Angle', 'Framing', 'Description'];
    const rows = shots.map(s => [
      s.shot_no, s.scene_no, s.shot_size, s.lens, s.movement, s.angle, s.framing, `"${s.description.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${project.title}_shotlist.csv`);
    document.body.appendChild(link);
    link.click();
    setExportOpen(false);
  };

  const exportPDF = () => {
    if (!project) return;
    const doc = new jsPDF();
    
    // PDF header styling
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(55, 202, 255); // Cyan
    doc.setFontSize(22);
    doc.text('SHYTLIST', 14, 20);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`PROJECT: ${project.title.toUpperCase()}`, 14, 28);
    doc.text(`DIRECTOR: ${project.director.toUpperCase()}`, 14, 34);
    doc.text(`DP: ${project.dp.toUpperCase()}`, 100, 34);
    
    const body = shots.map(s => [
      s.shot_no, s.scene_no, s.shot_size, s.lens, s.movement, s.angle, s.framing, s.description
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['#', 'SCENE', 'SHOT SIZE', 'LENS', 'MOVEMENT', 'ANGLE', 'FRAMING', 'DESCRIPTION']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [23, 23, 23], textColor: [55, 202, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 12 },
        2: { cellWidth: 25 },
        3: { cellWidth: 15 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 20 },
        7: { cellWidth: 'auto' },
      }
    });

    doc.save(`${project.title}_shotlist.pdf`);
    setExportOpen(false);
  };

  if (!project) return null;

  return (
    <div className="flex flex-col h-full bg-bg -mx-6 md:-mx-12 -my-8 overflow-hidden min-h-[calc(100vh-64px)]">
      <div className="flex h-full flex-1 overflow-hidden">
        {/* Sidebar Project Info */}
        <aside className="w-72 bg-zinc-950 border-r border-white/5 p-6 hidden lg:flex flex-col gap-10">
          <div className="space-y-4">
            <button 
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </button>
            <div className="pt-4">
              {isEditingInfo ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="label-micro opacity-70">Project Name</label>
                    <input 
                      className="input-field py-1.5 bg-zinc-900 border-brand-cyan/30 focus:border-brand-cyan"
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="label-micro opacity-70">Director</label>
                    <input 
                      className="input-field py-1.5 bg-zinc-900 border-brand-cyan/30 focus:border-brand-cyan"
                      value={tempDirector}
                      onChange={e => setTempDirector(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="label-micro opacity-70">Director of Photography</label>
                    <input 
                      className="input-field py-1.5 bg-zinc-900 border-brand-cyan/30 focus:border-brand-cyan"
                      value={tempDp}
                      onChange={e => setTempDp(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={saveProjectInfo}
                      className="btn-primary flex-1 py-2 text-xs"
                    >
                      Save Changes
                    </button>
                    <button 
                      onClick={() => {
                        setTempName(project.title || '');
                        setTempDirector(project.director || '');
                        setTempDp(project.dp || '');
                        setIsEditingInfo(false);
                      }}
                      className="btn-outline flex-1 py-2 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="cursor-pointer group/info relative"
                  onClick={() => setIsEditingInfo(true)}
                >
                  <div className="absolute -inset-2 rounded-xl bg-white/[0.02] opacity-0 group-hover/info:opacity-100 transition-opacity"></div>
                  <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white group-hover/info:text-brand-cyan transition-colors relative z-10">{project.title}</h2>
                  <p className="text-brand-yellow font-medium mt-1 relative z-10">Dir. {project.director}</p>
                  <p className="text-zinc-500 text-sm font-medium relative z-10">DP. {project.dp}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold border-b border-white/5 pb-3">Project Summary</p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-medium">Shots</span>
                <span className="text-zinc-300 font-semibold">{shots.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-medium">Est. Duration</span>
                <span className="text-brand-cyan font-bold">{totalDuration}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Export Options</p>
              <button 
                onClick={exportPDF} 
                className="btn-outline w-full justify-start gap-3 py-3"
              >
                <FileDown className="w-4 h-4 text-brand-yellow" />
                <span>Export PDF</span>
              </button>
              <button 
                onClick={exportCSV} 
                className="btn-outline w-full justify-start gap-3 py-3"
              >
                <FileSpreadsheet className="w-4 h-4 text-brand-yellow" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>


        </aside>

        {/* Main Editor Section */}
        <section className="flex-1 flex flex-col bg-bg overflow-hidden">
          {/* Header Actions for Mobile/Small Screens */}
          <div className="lg:hidden p-6 bg-nav border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <button onClick={() => navigate('/projects')} className="text-zinc-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
               <h2 className="text-lg font-semibold text-white tracking-tight truncate max-w-[200px]">{project.title}</h2>
            </div>
            <div className="flex gap-2">
               <button onClick={exportPDF} className="p-2 bg-zinc-900 rounded-lg border border-white/5 text-brand-yellow"><FileDown className="w-4 h-4" /></button>
            </div>
          </div>

          {/* INPUT BAR: PREMIUM GRID */}
          <div className="px-8 py-6 bg-nav border-b border-white/5">
            <form onSubmit={addShot} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-3 items-end">
              <div className="md:col-span-1">
                <label className="label-micro">Shot #</label>
                <select 
                  className="input-field w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2352525b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.4rem_center] bg-[size:1.2em_1.2em] bg-no-repeat pr-6" 
                  value={newShot.shot_no}
                  onChange={e => setNewShot(prev => ({ ...prev, shot_no: e.target.value }))}
                >
                  {OPTIONS.no.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="label-micro">Scene</label>
                <select 
                  className="input-field w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2352525b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.4rem_center] bg-[size:1.2em_1.2em] bg-no-repeat pr-6" 
                  value={newShot.scene_no}
                  onChange={e => setNewShot(prev => ({ ...prev, scene_no: e.target.value }))}
                >
                  {OPTIONS.scene.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                 <label className="label-micro">Size</label>
                 <select 
                   className="input-field w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2352525b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.4rem_center] bg-[size:1.2em_1.2em] bg-no-repeat pr-6"
                   value={newShot.shot_size}
                   onChange={e => setNewShot(prev => ({ ...prev, shot_size: e.target.value }))}
                 >
                   {OPTIONS.shot_size.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
                 </select>
              </div>
              <div className="md:col-span-1">
                 <label className="label-micro">Lens</label>
                 <select 
                   className="input-field w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2352525b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.4rem_center] bg-[size:1.2em_1.2em] bg-no-repeat pr-6"
                   value={newShot.lens}
                   onChange={e => setNewShot(prev => ({ ...prev, lens: e.target.value }))}
                 >
                   {OPTIONS.lens.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
                 </select>
              </div>
              <div className="md:col-span-2">
                 <label className="label-micro">Movement</label>
                 <select 
                   className="input-field w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2352525b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.4rem_center] bg-[size:1.2em_1.2em] bg-no-repeat pr-6"
                   value={newShot.movement}
                   onChange={e => setNewShot(prev => ({ ...prev, movement: e.target.value }))}
                 >
                   {OPTIONS.movement.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
                 </select>
              </div>
              <div className="md:col-span-2">
                 <label className="label-micro">Angle</label>
                 <select 
                   className="input-field w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2352525b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.4rem_center] bg-[size:1.2em_1.2em] bg-no-repeat pr-6"
                   value={newShot.angle}
                   onChange={e => setNewShot(prev => ({ ...prev, angle: e.target.value }))}
                 >
                   {OPTIONS.angle.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
                 </select>
              </div>
              <div className="md:col-span-2">
                <label className="label-micro">Description</label>
                <input 
                  required
                  type="text" 
                  placeholder="Shot details..."
                  className="input-field w-full focus:ring-1 focus:ring-brand-yellow/20" 
                  value={newShot.description}
                  onChange={e => setNewShot(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="md:col-span-1">
                <button 
                  type="submit" 
                  className="w-full bg-brand-yellow hover:bg-yellow-400 text-black font-semibold rounded-lg h-[42px] flex items-center justify-center transition-all shadow-lg shadow-brand-yellow/10"
                >
                  <Plus className="w-5 h-5 md:w-5 md:h-5" />
                </button>
              </div>
            </form>
          </div>

          {/* TABLE AREA */}
          <div className="flex-1 overflow-auto p-6">
            <div className="w-full rounded-2xl border border-white/5 bg-zinc-900/10 backdrop-blur-sm overflow-x-auto shadow-xl">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-zinc-900/50 border-b border-white/5">
                  <tr className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                    <th className="px-4 py-5 w-10"></th>
                    <th className="px-4 py-5 w-12 text-brand-cyan">#</th>
                    <th className="px-4 py-5 w-16">Scene</th>
                    <th className="px-4 py-5 w-36">Size</th>
                    <th className="px-4 py-5 w-24">Lens</th>
                    <th className="px-4 py-5 w-40">Movement</th>
                    <th className="px-4 py-5 w-40">Angle</th>
                    <th className="px-4 py-5">Description</th>
                    <th className="px-4 py-5 w-20 text-right pr-6"></th>
                  </tr>
                </thead>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="shotlist">
                    {(provided) => (
                      <tbody {...provided.droppableProps} ref={provided.innerRef}>
                        {shots.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-40 text-center text-zinc-600 font-medium text-sm">
                              Your shotlist is empty. Add a shot above to get started.
                            </td>
                          </tr>
                        ) : (
                          shots.map((shot, index) => (
                            <DraggableAny key={shot.id} draggableId={shot.id} index={index}>
                              {(provided: any, snapshot: any) => (
                                <tr
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? 'rgba(55, 202, 255, 0.05)' : '',
                                  }}
                                  className={`
                                    group transition-all duration-300
                                    ${snapshot.isDragging ? 'border-brand-cyan/50 z-50 rounded-lg overflow-hidden' : 'hover:bg-white/[0.02]'}
                                  `}
                                >
                                  <td className="px-4 py-5">
                                    <div {...provided.dragHandleProps} className="text-zinc-700 group-hover:text-zinc-500 transition-colors cursor-grab active:cursor-grabbing text-center">
                                      <GripVertical className="w-4 h-4 mx-auto" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-5 text-zinc-300 text-sm font-semibold tracking-tighter">{shot.shot_no}</td>
                                  <td className="px-4 py-5 text-zinc-500 text-sm font-medium">Sc. {shot.scene_no}</td>
                                  <td className="px-4 py-5 max-w-[144px]">
                                    <span className="text-[10px] font-semibold text-zinc-300 block truncate" title={shot.shot_size}>
                                      {shot.shot_size}
                                    </span>
                                  </td>
                                  <td className="px-4 py-5 text-sm font-medium text-zinc-400 truncate max-w-[96px]" title={shot.lens}>{shot.lens}</td>
                                  <td className="px-4 py-5 text-sm font-medium text-zinc-500 truncate max-w-[160px]" title={shot.movement}>{shot.movement}</td>
                                  <td className="px-4 py-5 text-sm font-medium text-zinc-500 truncate max-w-[160px]" title={shot.angle}>{shot.angle}</td>
                                  <td className="px-4 py-5">
                                    <p className="text-sm text-zinc-300 font-medium leading-relaxed max-w-2xl">{shot.description}</p>
                                  </td>
                                  <td className="px-4 py-5 text-right pr-6">
                                    <button 
                                      onClick={() => deleteShot(shot.id)}
                                      className="text-zinc-800 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              )}
                            </DraggableAny>
                          ))
                        )}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </DragDropContext>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
