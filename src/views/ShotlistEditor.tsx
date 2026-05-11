import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
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
  Film,
  Loader2,
  Image as ImageIcon,
  Upload,
  Sparkles,
  X,
  LayoutGrid,
  List,
  Copy,
  Edit2,
  ChevronRight,
  ChevronDown,
  Clock,
  Zap
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
import { toast } from 'sonner';

const SETUP_OVERHEAD_PER_SCENE = 15 * 60; // 15 minutes in seconds

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
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
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
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [collapsedScenes, setCollapsedScenes] = useState<Record<string, boolean>>({});
  
  const ALL_COLUMNS = ['Shot Size', 'Lens', 'Movement', 'Angle', 'Framing', 'Description'];
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportColumns, setExportColumns] = useState<string[]>(ALL_COLUMNS);



  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          const form = (e.target as HTMLElement).closest('form');
          if (form) form.requestSubmit();
        }
        return;
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const firstInput = document.querySelector('input, select') as HTMLElement;
        firstInput?.focus();
      }

      if (e.key.toLowerCase() === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // saveProjectInfo is not in scope here perfectly without adding it to deps or moving this down, 
        // but it was like this in the previous code so we'll keep the structure.
        // Actually, let's just trigger a click on the save button to avoid dependency issues if needed, or leave it.
        // The original code had it.
        saveProjectInfo();
      }

      if (e.key === 'Escape') {
        setEditingShot(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, tempName, tempDirector, tempDp]);

  // Group shots by scene
  const groupedShots = useMemo(() => {
    const groups: Record<string, Shot[]> = {};
    shots.forEach(shot => {
      if (!groups[shot.scene_no]) groups[shot.scene_no] = [];
      groups[shot.scene_no].push(shot);
    });
    return groups;
  }, [shots]);

  const sceneNumbers = useMemo(() => 
    Object.keys(groupedShots).sort((a, b) => parseInt(a) - parseInt(b)), 
  [groupedShots]);

  const productionMetrics = useMemo(() => {
    const shotSeconds = shots.reduce((sum, shot) => sum + calculateShotDuration(shot), 0);
    const sceneCount = sceneNumbers.length;
    const totalSetupSeconds = Math.max(0, (sceneCount - 1) * 15 * 60); // 15 mins per scene change
    
    return {
      shotsDuration: formatDuration(shotSeconds),
      setupDuration: formatDuration(totalSetupSeconds),
      totalDuration: formatDuration(shotSeconds + totalSetupSeconds),
      sceneCount
    };
  }, [shots, sceneNumbers]);

  const toggleScene = (sceneNo: string) => {
    setCollapsedScenes(prev => ({ ...prev, [sceneNo]: !prev[sceneNo] }));
  };

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
          toast.error('Project not found');
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
        toast.error('Failed to load project details');
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
      toast.success('Project details updated');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving project info:', error);
      toast.error('Failed to save project changes');
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
        toast.success('Shot added');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Error adding shot:', error);
      toast.error('Failed to add shot');
    }
  };

  const updateShot = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingShot) return;

    try {
      setSaveStatus('saving');
      const { error } = await supabase
        .from('shots')
        .update(editingShot)
        .eq('id', editingShot.id);

      if (error) throw error;

      setShots(shots.map(s => s.id === editingShot.id ? editingShot : s));
      setEditingShot(null);
      setSaveStatus('saved');
      toast.success('Shot updated');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error updating shot:', error);
      toast.error('Failed to update shot');
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
      const remainingShots = shots.filter(s => s.id !== shotId);
      
      // Update remaining shots' numbers in database to keep them sequential
      const renumberedShots = remainingShots.map((s, idx): Shot => ({
        ...s,
        shot_no: (idx + 1).toString()
      }));
      
      // Batch update the database
      const updates = renumberedShots.map(shot => supabase
        .from('shots')
        .update({ shot_no: shot.shot_no })
        .eq('id', shot.id)
      );
      
      await Promise.all(updates);
      setShots(renumberedShots);
      
      setNewShot(prev => ({ ...prev, shot_no: (renumberedShots.length + 1).toString() }));
      
      setSaveStatus('saved');
      toast.success('Shot deleted');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error deleting shot:', error);
      toast.error('Failed to delete shot');
    }
  };

  const handleImageUpload = async (shotId: string, file: File) => {
    try {
      setSaveStatus('saving');
      const fileExt = file.name.split('.').pop();
      const fileName = `${shotId}-${Math.random()}.${fileExt}`;
      const filePath = `storyboards/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('storyboards')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('storyboards')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('shots')
        .update({ thumbnail_url: publicUrl })
        .eq('id', shotId);

      if (updateError) throw updateError;

      setShots(shots.map(s => s.id === shotId ? { ...s, thumbnail_url: publicUrl } : s));
      setSaveStatus('saved');
      toast.success('Storyboard updated');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
  };

  const addSequence = async (type: 'master_coverage' | 'overs_tows' | 'detail_coverage') => {
    if (!project) return;
    
    let sequenceShots: Omit<Shot, 'id' | 'project_id'>[] = [];
    const currentScene = newShot.scene_no;

    if (type === 'master_coverage') {
      sequenceShots = [
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Wide Shot', description: 'Master Shot' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Medium Close Up', description: 'Coverage A' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Medium Close Up', description: 'Coverage B' },
      ];
    } else if (type === 'overs_tows') {
      sequenceShots = [
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Two Shot', description: 'Wide Profile' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Over the Shoulder', description: 'OTS Character 1' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Over the Shoulder', description: 'OTS Character 2' },
      ];
    } else if (type === 'detail_coverage') {
      sequenceShots = [
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Close Up', description: 'Primary Action' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Extreme Close Up', description: 'Detail / Insert 1' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Extreme Close Up', description: 'Detail / Insert 2' },
      ];
    }

    try {
      setSaveStatus('saving');
      const startNo = shots.length + 1;
      const shotsToInsert = sequenceShots.map((s, idx) => ({
        ...s,
        project_id: project.id,
        shot_no: (startNo + idx).toString()
      }));

      const { data, error } = await supabase
        .from('shots')
        .insert(shotsToInsert)
        .select();

      if (error) throw error;

      if (data) {
        const updatedShots = [...shots, ...data];
        setShots(updatedShots);
        setNewShot(prev => ({ 
          ...prev, 
          shot_no: (updatedShots.length + 1).toString() 
        }));
        setSaveStatus('saved');
        toast.success(`Added ${data.length} shots to Scene ${currentScene}`);
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Error adding sequence:', error);
      toast.error('Failed to add shot sequence');
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!project) return;
    try {
      setSaveStatus('saving');
      const fileExt = file.name.split('.').pop();
      const fileName = `${project.id}-logo.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('projects')
        .update({ company_logo_url: publicUrl })
        .eq('id', project.id);

      if (updateError) throw updateError;

      setProject({ ...project, company_logo_url: publicUrl });
      setSaveStatus('saved');
      toast.success('Production logo updated');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
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
      toast.success('Order saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving reorder:', error);
      toast.error('Failed to save shot order');
    }
  };

  const exportCSV = () => {
    if (!project) return;
    const baseHeaders = ['No', 'Scene'];
    const activeHeaders = exportColumns;
    const headers = [...baseHeaders, ...activeHeaders];
    
    const rows = shots.map(s => {
      const row = [s.shot_no, s.scene_no];
      if (activeHeaders.includes('Shot Size')) row.push(s.shot_size);
      if (activeHeaders.includes('Lens')) row.push(s.lens);
      if (activeHeaders.includes('Movement')) row.push(s.movement);
      if (activeHeaders.includes('Angle')) row.push(s.angle);
      if (activeHeaders.includes('Framing')) row.push(s.framing);
      if (activeHeaders.includes('Description')) row.push(`"${s.description.replace(/"/g, '""')}"`);
      return row;
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${project.title}_shotlist.csv`);
    document.body.appendChild(link);
    link.click();
    setIsExportModalOpen(false);
  };

  const exportPDF = async () => {
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

    // Optional Logo
    if (project.company_logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = project.company_logo_url;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // fail gracefully
        });
        // Check if image has dimensions
        if (img.width > 0) {
          doc.addImage(img, 'PNG', 160, 10, 35, 20);
        }
      } catch (e) {
        console.error('Failed to add logo to PDF', e);
      }
    }
    
    const baseHeaders = ['#', 'SCENE'];
    const activeHeaders = exportColumns.map(c => c.toUpperCase());
    const head = [[...baseHeaders, ...activeHeaders]];

    const body = shots.map(s => {
      const row = [s.shot_no, s.scene_no];
      if (exportColumns.includes('Shot Size')) row.push(s.shot_size);
      if (exportColumns.includes('Lens')) row.push(s.lens);
      if (exportColumns.includes('Movement')) row.push(s.movement);
      if (exportColumns.includes('Angle')) row.push(s.angle);
      if (exportColumns.includes('Framing')) row.push(s.framing);
      if (exportColumns.includes('Description')) row.push(s.description);
      return row;
    });

    autoTable(doc, {
      startY: 45,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [23, 23, 23], textColor: [55, 202, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, cellPadding: 3 }
    });

    doc.save(`${project.title}_shotlist.pdf`);
    setIsExportModalOpen(false);
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
            <div className="px-4 py-2 rounded-lg bg-zinc-900/30 border border-white/5 flex items-center gap-3">
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3 h-3 text-brand-cyan animate-spin" />
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Saving Changes...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-brand-yellow" />
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">All Changes Saved</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Cloud Synced</span>
                </>
              )}
            </div>

            {/* PRODUCTION ESTIMATE DASHBOARD */}
            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-5">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Clock className="w-3.5 h-3.5 text-brand-cyan" />
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Production Estimate</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Shooting</span>
                  <p className="text-sm font-semibold text-white">{productionMetrics.shotsDuration}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Setups</span>
                  <p className="text-sm font-semibold text-zinc-400">{productionMetrics.setupDuration}</p>
                </div>
              </div>

              <div className="pt-2">
                <div className="bg-brand-cyan/5 rounded-xl p-3 border border-brand-cyan/10">
                  <span className="text-[9px] text-brand-cyan font-bold uppercase tracking-widest block mb-1">Estimated Day Length</span>
                  <p className="text-2xl font-bold text-white tracking-tight">{productionMetrics.totalDuration}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>{productionMetrics.sceneCount} Scenes</span>
                <span>{shots.length} Shots</span>
              </div>
            </div>

            {/* BRANDING LOGO */}
            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold border-b border-white/5 pb-3">Production Branding</p>
              <div 
                className="aspect-video bg-zinc-950 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-yellow/30 transition-all group overflow-hidden relative"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleLogoUpload(file);
                  };
                  input.click();
                }}
              >
                {project.company_logo_url ? (
                  <img src={project.company_logo_url} alt="Logo" className="w-full h-full object-contain p-4" />
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-zinc-600 group-hover:text-brand-yellow transition-colors" />
                    <span className="text-[10px] text-zinc-600 font-bold uppercase">Upload Logo</span>
                  </>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-[10px] text-white font-bold uppercase">Change Logo</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Export & Share</p>
              <button 
                onClick={() => setIsExportModalOpen(true)} 
                className="btn-primary w-full justify-center gap-3 py-3"
              >
                <FileDown className="w-4 h-4" />
                <span>Export Settings</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Shot Presets</p>
              <button 
                onClick={() => addSequence('master_coverage')}
                className="w-full bg-zinc-900 border border-white/5 hover:border-brand-cyan/30 text-white rounded-xl p-3 transition-all group flex items-center gap-3 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-brand-cyan/10 transition-colors">
                  <Copy className="w-4 h-4 text-brand-cyan" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">Master + Coverage</p>
                  <p className="text-[9px] text-zinc-500 font-medium">3 shots (Master, A, B)</p>
                </div>
              </button>
              <button 
                onClick={() => addSequence('overs_tows')}
                className="w-full bg-zinc-900 border border-white/5 hover:border-brand-cyan/30 text-white rounded-xl p-3 transition-all group flex items-center gap-3 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-brand-cyan/10 transition-colors">
                  <Copy className="w-4 h-4 text-brand-cyan" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">Overs + Two Shot</p>
                  <p className="text-[9px] text-zinc-500 font-medium">3 shots (2S, OTS A, OTS B)</p>
                </div>
              </button>
              <button 
                onClick={() => addSequence('detail_coverage')}
                className="w-full bg-zinc-900 border border-white/5 hover:border-brand-cyan/30 text-white rounded-xl p-3 transition-all group flex items-center gap-3 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-brand-cyan/10 transition-colors">
                  <Copy className="w-4 h-4 text-brand-cyan" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">Detail / Macro Pkg</p>
                  <p className="text-[9px] text-zinc-500 font-medium">3 shots (CU, 2x ECU)</p>
                </div>
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

          {/* VIEW TOGGLE BAR */}
          <div className="px-8 py-4 bg-zinc-950 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-brand-cyan text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
                Table View
              </button>
              <button 
                onClick={() => setViewMode('gallery')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'gallery' ? 'bg-brand-cyan text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                Gallery View
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Showing {shots.length} Shots</span>
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

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-auto p-6">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-12 pb-20">
                {sceneNumbers.map(sceneNo => {
                  const sceneShots = groupedShots[sceneNo];
                  const isCollapsed = collapsedScenes[sceneNo];

                  return (
                    <div key={sceneNo} className="space-y-4">
                      {/* SCENE HEADER */}
                      <button 
                        onClick={() => toggleScene(sceneNo)}
                        className="flex items-center gap-4 group/scene w-full text-left"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 text-zinc-500 group-hover/scene:border-brand-cyan/50 group-hover/scene:text-brand-cyan transition-all">
                          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white tracking-tight">Scene {sceneNo}</h3>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{sceneShots.length} Shots in Scene</p>
                        </div>
                        <div className="flex-1 h-px bg-white/5"></div>
                      </button>

                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            {viewMode === 'table' ? (
                              <div className="w-full rounded-2xl border border-white/5 bg-zinc-900/10 backdrop-blur-sm overflow-x-auto shadow-xl">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                  <thead className="bg-zinc-900/50 border-b border-white/5">
                                    <tr className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                                      <th className="px-4 py-5 w-10"></th>
                                      <th className="px-4 py-5 w-12 text-brand-cyan">#</th>
                                      <th className="px-4 py-5 w-24">Storyboard</th>
                                      <th className="px-4 py-5 w-36">Size</th>
                                      <th className="px-4 py-5 w-24">Lens</th>
                                      <th className="px-4 py-5 w-40">Movement</th>
                                      <th className="px-4 py-5 w-40">Angle</th>
                                      <th className="px-4 py-5">Description</th>
                                      <th className="px-4 py-5 w-20 text-right pr-6"></th>
                                    </tr>
                                  </thead>
                                  <Droppable droppableId={`scene-${sceneNo}-table`}>
                                    {(provided) => (
                                      <tbody {...provided.droppableProps} ref={provided.innerRef}>
                                        {sceneShots.map((shot, index) => (
                                          <DraggableAny key={shot.id} draggableId={shot.id} index={shots.indexOf(shot)}>
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
                                                <td className="px-4 py-5">
                                                  <div 
                                                    className="w-16 h-10 bg-zinc-800 rounded-lg border border-white/5 overflow-hidden flex items-center justify-center cursor-pointer hover:border-brand-cyan/50 transition-all group/sb relative"
                                                    onClick={() => {
                                                      const input = document.createElement('input');
                                                      input.type = 'file';
                                                      input.accept = 'image/*';
                                                      input.onchange = (e) => {
                                                        const file = (e.target as HTMLInputElement).files?.[0];
                                                        if (file) handleImageUpload(shot.id, file);
                                                      };
                                                      input.click();
                                                    }}
                                                  >
                                                    {shot.thumbnail_url ? (
                                                      <img src={shot.thumbnail_url} alt="Storyboard" className="w-full h-full object-cover" />
                                                    ) : (
                                                      <ImageIcon className="w-4 h-4 text-zinc-600 group-hover/sb:text-brand-cyan transition-colors" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/sb:opacity-100 flex items-center justify-center transition-opacity">
                                                      <Upload className="w-3 h-3 text-white" />
                                                    </div>
                                                  </div>
                                                </td>
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
                                                  <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                      onClick={() => setEditingShot(shot)}
                                                      className="text-zinc-800 hover:text-brand-cyan opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                                                    >
                                                      <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                      onClick={() => deleteShot(shot.id)}
                                                      className="text-zinc-800 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                                                    >
                                                      <Trash2 className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </DraggableAny>
                                        ))}
                                        {provided.placeholder}
                                      </tbody>
                                    )}
                                  </Droppable>
                                </table>
                              </div>
                            ) : (
                              <Droppable droppableId={`scene-${sceneNo}-gallery`} direction="horizontal">
                                {(provided) => (
                                  <div 
                                    {...provided.droppableProps} 
                                    ref={provided.innerRef}
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                                  >
                                    {sceneShots.map((shot, index) => (
                                      <DraggableAny key={shot.id} draggableId={shot.id} index={shots.indexOf(shot)}>
                                        {(provided: any, snapshot: any) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`
                                              group bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300
                                              ${snapshot.isDragging ? 'shadow-2xl shadow-brand-cyan/20 ring-2 ring-brand-cyan/50 scale-105 z-50' : 'hover:border-white/10 hover:bg-zinc-900/50'}
                                            `}
                                          >
                                            {/* Card Header / Storyboard */}
                                            <div 
                                              className="aspect-video bg-zinc-900 relative group/sb overflow-hidden cursor-pointer"
                                              onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = (e) => {
                                                  const file = (e.target as HTMLInputElement).files?.[0];
                                                  if (file) handleImageUpload(shot.id, file);
                                                };
                                                input.click();
                                              }}
                                            >
                                              {shot.thumbnail_url ? (
                                                <img src={shot.thumbnail_url} alt="Storyboard" className="w-full h-full object-cover" />
                                              ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                  <ImageIcon className="w-6 h-6 text-zinc-700 group-hover/sb:text-brand-cyan transition-colors" />
                                                  <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">No Storyboard</span>
                                                </div>
                                              )}

                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/sb:opacity-100 flex items-center justify-center transition-opacity">
                                                <div className="flex flex-col items-center gap-2">
                                                  <Upload className="w-5 h-5 text-white" />
                                                  <span className="text-[10px] text-white font-bold uppercase tracking-widest">Update Image</span>
                                                </div>
                                              </div>

                                              {/* Shot Number Badge */}
                                              <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-brand-cyan">#{shot.shot_no}</span>
                                              </div>

                                              {/* Drag Handle */}
                                              <div 
                                                {...provided.dragHandleProps}
                                                className="absolute top-3 right-3 p-1.5 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                                              >
                                                <GripVertical className="w-3 h-3" />
                                              </div>
                                            </div>

                                            {/* Card Content */}
                                            <div className="p-4 space-y-4">
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                  <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{shot.shot_size}</p>
                                                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">{shot.lens} • {shot.movement}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <button 
                                                    onClick={() => setEditingShot(shot)}
                                                    className="p-1.5 text-zinc-700 hover:text-brand-cyan transition-colors"
                                                  >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button 
                                                    onClick={() => deleteShot(shot.id)}
                                                    className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </div>

                                              <div className="h-px bg-white/5"></div>

                                              <div>
                                                <p className="text-xs text-zinc-400 font-medium leading-relaxed line-clamp-3">
                                                  {shot.description || "No description provided."}
                                                </p>
                                              </div>

                                              <div className="flex items-center gap-2 pt-1">
                                                <span className="text-[10px] bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded border border-white/5 font-bold uppercase tracking-tighter">{shot.angle}</span>
                                                <span className="text-[10px] bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded border border-white/5 font-bold uppercase tracking-tighter">{shot.framing}</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </DraggableAny>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {shots.length === 0 && (
                  <div className="py-40 text-center text-zinc-600 font-medium text-sm bg-zinc-900/10 rounded-3xl border border-white/5">
                    Your shotlist is empty. Add a shot above to get started.
                  </div>
                )}
              </div>
            </DragDropContext>
          </div>
          </section>
      </div>

      {/* Export Settings Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExportModalOpen(false)}
              className="absolute inset-0 bg-bg/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-3xl overflow-hidden"
            >
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-8 text-left">
                <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Export Settings</h2>
                <p className="text-zinc-500 text-sm">Choose which columns to include in your export. Note: '#' and 'Scene' are always included.</p>
              </div>

              <div className="space-y-4 mb-8">
                {ALL_COLUMNS.map(col => (
                  <label key={col} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${exportColumns.includes(col) ? 'bg-brand-cyan border-brand-cyan' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                      {exportColumns.includes(col) && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                    </div>
                    <span className="text-sm font-medium text-zinc-300">{col}</span>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={exportColumns.includes(col)}
                      onChange={() => {
                        setExportColumns(prev => 
                          prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
                        );
                      }}
                    />
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={exportPDF} 
                  className="btn-primary flex-1 py-3 font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  PDF
                </button>
                <button 
                  onClick={exportCSV} 
                  className="btn-outline flex-1 py-3 font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-brand-yellow" />
                  CSV
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Shot Modal */}
      <AnimatePresence>
        {editingShot && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingShot(null)}
              className="absolute inset-0 bg-bg/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 p-8 md:p-12 rounded-3xl shadow-3xl overflow-hidden"
            >
              <button
                onClick={() => setEditingShot(null)}
                className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-10 text-left">
                <div className="flex items-center gap-3 mb-2">
                  <Edit2 className="w-6 h-6 text-brand-cyan" />
                  <h2 className="text-3xl font-semibold text-white tracking-tight">Edit Shot #{editingShot.shot_no}</h2>
                </div>
                <p className="text-zinc-500 text-sm">Update shot details for Scene {editingShot.scene_no}.</p>
              </div>

              <form onSubmit={updateShot} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="label-micro">Shot Size</label>
                    <select 
                      className="input-field w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2352525b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.4rem_center] bg-[size:1.2em_1.2em] bg-no-repeat pr-6"
                      value={editingShot.shot_size}
                      onChange={e => setEditingShot({ ...editingShot, shot_size: e.target.value })}
                    >
                      {OPTIONS.shot_size.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-micro">Lens</label>
                    <select 
                      className="input-field w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2352525b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.4rem_center] bg-[size:1.2em_1.2em] bg-no-repeat pr-6"
                      value={editingShot.lens}
                      onChange={e => setEditingShot({ ...editingShot, lens: e.target.value })}
                    >
                      {OPTIONS.lens.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-micro">Movement</label>
                    <select 
                      className="input-field w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2352525b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.4rem_center] bg-[size:1.2em_1.2em] bg-no-repeat pr-6"
                      value={editingShot.movement}
                      onChange={e => setEditingShot({ ...editingShot, movement: e.target.value })}
                    >
                      {OPTIONS.movement.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-micro">Angle</label>
                    <select 
                      className="input-field w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2352525b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.4rem_center] bg-[size:1.2em_1.2em] bg-no-repeat pr-6"
                      value={editingShot.angle}
                      onChange={e => setEditingShot({ ...editingShot, angle: e.target.value })}
                    >
                      {OPTIONS.angle.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="label-micro">Description</label>
                  <textarea 
                    className="input-field min-h-[100px] py-3 resize-none"
                    value={editingShot.description}
                    onChange={e => setEditingShot({ ...editingShot, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    className="btn-primary flex-1 py-4 font-semibold rounded-xl"
                  >
                    Save Changes
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingShot(null)}
                    className="btn-outline px-8 py-4 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
