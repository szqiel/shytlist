import { useState, useEffect, FormEvent, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { 
  Plus, Trash, DotsSixVertical, ArrowLeft, CheckCircle,
  FileArrowDown, FileCsv, Image as ImageIcon, Upload, X,
  SquaresFour, List, Copy, PencilSimple, CaretRight, CaretDown, Clock
} from '@phosphor-icons/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const DraggableAny = Draggable as any;
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import imageCompression from 'browser-image-compression';
import { Project, Shot } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useShotlist } from '../lib/useShotlist';

const calculateShotDuration = (shot: Shot): number => {
  let minutes = 5;
  const size = shot.shot_size;
  if (["Extreme Wide Shot", "Wide Shot", "Group Shot"].includes(size)) minutes += 3;
  else if (["Full Shot", "Cowboy Shot", "Medium Full Shot"].includes(size)) minutes += 2;
  else if (["Over the Shoulder", "Two Shot"].includes(size)) minutes += 3;
  else if (["Medium Shot", "Medium Close Up", "Point of View"].includes(size)) minutes += 1;
  else if (["Close Up"].includes(size)) minutes += 0;
  else if (["Extreme Close Up", "Insert"].includes(size)) minutes -= 1;

  const movement = shot.movement;
  if (movement === "Static" || !movement) { /* no extra */ }
  else if (["Pan Left", "Pan Right", "Tilt Up", "Tilt Down", "Zoom In", "Zoom Out"].includes(movement)) minutes += 2;
  else if (["Dolly In", "Dolly Out", "Crab Left", "Crab Right", "Pedestal Up", "Pedestal Down"].includes(movement)) minutes += 4;
  else if (["Crane Up", "Crane Down"].includes(movement)) minutes += 5;
  else if (["Steadicam", "Handheld", "Gimbal", "Tracking Left", "Tracking Right"].includes(movement)) minutes += 3;
  else if (movement === "Drone / Aerial") minutes += 6;

  return Math.max(3, minutes);
};

const SIZE_TAKE_DURATION: Record<string, number> = {
  "Extreme Wide Shot": 45, "Wide Shot": 45, "Group Shot": 45,
  "Full Shot": 30, "Cowboy Shot": 30, "Medium Full Shot": 30,
  "Medium Shot": 20, "Medium Close Up": 20,
  "Over the Shoulder": 25, "Two Shot": 25,
  "Close Up": 15, "Point of View": 15,
  "Extreme Close Up": 8, "Insert": 8,
};

const calculateShootingDuration = (shot: Shot): number => {
  const MOVEMENT_TAKES: Record<string, number> = {
    "Static": 3,
    "Pan Left": 3, "Pan Right": 3, "Tilt Up": 3, "Tilt Down": 3,
    "Zoom In": 3, "Zoom Out": 3,
    "Dolly In": 4, "Dolly Out": 4, "Crab Left": 4, "Crab Right": 4,
    "Pedestal Up": 4, "Pedestal Down": 4,
    "Handheld": 4,
    "Crane Up": 5, "Crane Down": 5,
    "Steadicam": 5, "Gimbal": 5, "Tracking Left": 5, "Tracking Right": 5,
    "Drone / Aerial": 5,
  };

  const ANGLE_EXTRA: Record<string, number> = {
    "Eye Level": 0, "Shoulder Level": 0,
    "High Angle": 1, "Low Angle": 1, "Hip Level": 1,
    "Dutch Angle": 1, "Knee Level": 1, "Ground Level": 1,
    "Top Down / Overhead": 2, "Bird's Eye View": 2, "Worm's Eye View": 2,
  };

  const takeDuration = SIZE_TAKE_DURATION[shot.shot_size] || 20;
  const baseTakes = MOVEMENT_TAKES[shot.movement] || 3;
  const angleExtra = ANGLE_EXTRA[shot.angle] || 0;
  const numTakes = baseTakes + angleExtra;

  return Math.ceil((takeDuration * numTakes) / 60) + 1;
};

const estimateFilmDuration = (shot: Shot): number => {
  const takeDuration = SIZE_TAKE_DURATION[shot.shot_size] || 20;
  return Math.round(takeDuration * 0.7);
};

const INITIAL_SHOT_STATE: Omit<Shot, 'id' | 'project_id'> = {
  shot_no: '1',
  scene_no: '1',
  shot_size: 'Close Up (CU)',
  lens: '35mm',
  movement: 'Static',
  angle: 'Eye Level',
  framing: 'Rule of Thirds',
  description: '',
};

const OPTIONS = {
  no: Array.from({ length: 100 }, (_, i) => (i + 1).toString()),
  scene: Array.from({ length: 50 }, (_, i) => (i + 1).toString()),
  shot_size: [
    "Extreme Wide Shot (EWS)", "Wide Shot (WS)", "Full Shot (FS)", "Medium Wide Shot (MWS)",
    "Cowboy Shot (CS)", "Medium Shot (MS)", "Medium Close Up (MCU)", "Close Up (CU)",
    "Choker Shot (CH)", "Extreme Close Up (ECU)", "Insert Shot (INS)", "Over the Shoulder (OTS)",
    "Point of View (POV)", "Two Shot (2S)", "Group Shot (GS)", "Establishing Shot (EST)",
    "Reaction Shot (REA)"
  ],
  lens: [
    "8mm (Fisheye)", "10mm", "12mm", "14mm", "16mm", "18mm", "21mm", "24mm", "28mm", "32mm",
    "35mm", "40mm", "50mm", "65mm", "75mm", "85mm", "100mm", "135mm", "150mm", "200mm", "300mm",
    "Macro", "Tilt-Shift", "Probe Lens", "Zoom Lens (Variable)",
    "Anamorphic 35mm", "Anamorphic 50mm", "Anamorphic 75mm", "Anamorphic 100mm"
  ],
  movement: [
    "Static", "Pan Left", "Pan Right", "Tilt Up", "Tilt Down", "Whip Pan", "Whip Tilt",
    "Dolly In", "Dolly Out", "Push In", "Pull Out", "Tracking Left", "Tracking Right",
    "Crab Left", "Crab Right", "Dolly Zoom", "Steadicam", "Handheld", "Gimbal", "Shoulder Rig",
    "Crane Up", "Crane Down", "Pedestal Up", "Pedestal Down", "Jib Up", "Jib Down", "Technocrane",
    "Drone / Aerial", "Motion Control", "360-Degree Spin"
  ],
  angle: [
    "Eye Level", "Low Angle", "Slight Low Angle", "High Angle", "Slight High Angle",
    "Dutch Angle (Dutch Tilt)", "Top Down / Overhead", "Bird's Eye View", "Worm's Eye View",
    "Ground Level", "Knee Level", "Hip Level", "Shoulder Level",
    "Over-the-Shoulder Angle", "Subjective POV Angle", "Canted Angle"
  ],
  framing: [
    "Rule of Thirds", "Symmetric", "Leading Lines", "Golden Spiral", "Frame-Within-a-Frame",
    "Off-Center / Negative Space", "Quadrants Layout", "Deep Focus Framing",
    "Shallow Depth of Field (Bokeh)", "Rack Focus Framing", "Low Key / Chiaroscuro",
    "High Key Framing"
  ],
};

const useDraggableInPortal = () => {
  const self = useRef<any>({}).current;

  useEffect(() => {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.pointerEvents = 'none';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.zIndex = '99999';
    self.elt = div;
    document.body.appendChild(div);
    return () => {
      if (self.elt && document.body.contains(self.elt)) {
        document.body.removeChild(self.elt);
      }
    };
  }, [self]);

  return (render: any) => (provided: any, snapshot: any) => {
    const element = render(provided, snapshot);
    if (snapshot.isDragging) {
      return createPortal(element, self.elt);
    }
    return element;
  };
};

export default function ShotlistEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shots, addShot: addShotHook, updateShot: updateShotHook, deleteShot: deleteShotHook, reorderShots: reorderShotsHook } = useShotlist(id);
  const renderDraggable = useDraggableInPortal();
  
  const [project, setProject] = useState<Project | null>(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempDirector, setTempDirector] = useState('');
  const [tempDp, setTempDp] = useState('');
  const [newShot, setNewShot] = useState<Omit<Shot, 'id' | 'project_id'>>({ ...INITIAL_SHOT_STATE });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [collapsedScenes, setCollapsedScenes] = useState<Record<string, boolean>>({});
  const [descriptionError, setDescriptionError] = useState(false);
  
  const ALL_COLUMNS = ['Storyboard', 'Shot Size', 'Lens', 'Movement', 'Angle', 'Framing', 'Description'];
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportColumns, setExportColumns] = useState<string[]>(ALL_COLUMNS);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [pendingPresetType, setPendingPresetType] = useState<'master_coverage' | 'overs_tows' | 'action_chase' | 'suspense_tension' | 'reveal' | null>(null);
  const [presetSceneNo, setPresetSceneNo] = useState('1');

  // Load project
  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
      if (error || !data) {
        toast.error('Project not found');
        navigate('/projects');
        return;
      }
      setProject(data);
      setTempName(data.title || '');
      setTempDirector(data.director || '');
      setTempDp(data.dp || '');
    };
    loadProject();
  }, [id, navigate]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target && (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.tagName.toLowerCase() === 'button' ||
        target.isContentEditable
      );

      if (isInteractive) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          const form = target.closest('form');
          if (form) form.requestSubmit();
        }
        return;
      }

      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        (document.querySelector('input, select') as HTMLElement)?.focus();
      }
      if (e.key.toLowerCase() === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
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
    const shootingMinutes = shots.reduce((sum, shot) => sum + calculateShootingDuration(shot), 0);
    const setupMinutes = shots.reduce((sum, shot) => sum + calculateShotDuration(shot), 0);
    const sceneCount = sceneNumbers.length;
    const transitionMinutes = Math.max(0, (sceneCount - 1) * 10);
    const totalMinutes = shootingMinutes + setupMinutes + transitionMinutes;
    const filmSeconds = shots.reduce((sum, shot) => sum + estimateFilmDuration(shot), 0);
    const formatMin = (m: number) => {
      const h = Math.floor(m / 60);
      const r = m % 60;
      return h > 0 ? `${h}h ${r}m` : `${r}m`;
    };
    const formatFilm = (totalSec: number) => {
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };
    return {
      shootingDuration: formatMin(shootingMinutes),
      setupDuration: formatMin(setupMinutes),
      transitionDuration: formatMin(transitionMinutes),
      totalDuration: formatMin(totalMinutes),
      filmDuration: formatFilm(filmSeconds),
      sceneCount
    };
  }, [shots, sceneNumbers]);

  const toggleScene = (sceneNo: string) => {
    setCollapsedScenes(prev => ({ ...prev, [sceneNo]: !prev[sceneNo] }));
  };

  const saveProjectInfo = async () => {
    if (!project || !tempName || !tempDirector || !tempDp) return;
    try {
      setSaveStatus('saving');
      const { error } = await supabase.from('projects').update({ title: tempName, director: tempDirector, dp: tempDp }).eq('id', project.id);
      if (error) throw error;
      setProject({ ...project, title: tempName, director: tempDirector, dp: tempDp });
      setIsEditingInfo(false);
      setSaveStatus('saved');
      toast.success('Project updated');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) { toast.error('Failed to update project'); }
  };

  const addShot = async (e: FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (!newShot.description.trim()) {
      setDescriptionError(true);
      toast.error('Description is required');
      return;
    }
    setDescriptionError(false);
    try {
      setSaveStatus('saving');
      await addShotHook(newShot);
      const nextSceneNo = newShot.scene_no;
      const nextShotNo = (shots.filter(s => s.scene_no === nextSceneNo).length + 2).toString();
      setNewShot({ ...INITIAL_SHOT_STATE, shot_no: nextShotNo, scene_no: nextSceneNo });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) { toast.error('Failed to add shot'); }
  };

  const updateShot = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingShot) return;
    try {
      setSaveStatus('saving');
      await updateShotHook(editingShot);
      setEditingShot(null);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) { toast.error('Failed to update shot'); }
  };

  const deleteShot = async (shotId: string) => {
    if (!project) return;
    try {
      setSaveStatus('saving');
      const deletedShot = shots.find(s => s.id === shotId);
      if (deletedShot?.storyboard_url) {
        try {
          const urlObj = new URL(deletedShot.storyboard_url);
          const pathInBucket = urlObj.pathname.split('/public/storyboards/')[1];
          if (pathInBucket) await supabase.storage.from('storyboards').remove([pathInBucket]);
        } catch (e) { console.error('Failed to delete old storyboard', e); }
      }
      await deleteShotHook(shotId);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) { toast.error('Failed to delete shot'); }
  };

  const handleImageUpload = async (shotId: string, file: File) => {
    try {
      setSaveStatus('saving');
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1080, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const filePath = `storyboards/${shotId}_${Math.random()}.webp`;

      const currentShot = shots.find(s => s.id === shotId);
      if (currentShot?.storyboard_url) {
        try {
          const urlObj = new URL(currentShot.storyboard_url);
          const pathInBucket = urlObj.pathname.split('/public/storyboards/')[1];
          if (pathInBucket) await supabase.storage.from('storyboards').remove([pathInBucket]);
        } catch (e) { console.error('Failed to delete old storyboard', e); }
      }

      const { error: uploadError } = await supabase.storage.from('storyboards').upload(filePath, compressedFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('storyboards').getPublicUrl(filePath);
      await supabase.from('shots').update({ storyboard_url: publicUrl }).eq('id', shotId);
      setSaveStatus('saved');
      toast.success('Storyboard updated');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) { toast.error('Upload failed'); }
  };

  const addSequence = (type: 'master_coverage' | 'overs_tows' | 'action_chase' | 'suspense_tension' | 'reveal') => {
    setPendingPresetType(type);
    setPresetSceneNo(newShot.scene_no);
    setIsPresetModalOpen(true);
  };

  const confirmAddSequence = async () => {
    if (!project || !pendingPresetType) return;
    let sequenceShots: Omit<Shot, 'id' | 'project_id'>[] = [];
    const currentScene = presetSceneNo;
    if (pendingPresetType === 'master_coverage') {
      sequenceShots = [
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Wide Shot (WS)', lens: '16mm', movement: 'Static', angle: 'Eye Level', description: 'Establishing Master' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Medium Shot (MS)', lens: '35mm', movement: 'Static', angle: 'Eye Level', description: 'Character A Medium Coverage' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Medium Shot (MS)', lens: '35mm', movement: 'Static', angle: 'Eye Level', description: 'Character B Medium Coverage' },
      ];
    } else if (pendingPresetType === 'overs_tows') {
      sequenceShots = [
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Two Shot (2S)', lens: '24mm', movement: 'Dolly In', angle: 'Eye Level', description: 'Dialogue Profile' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Over the Shoulder (OTS)', lens: '50mm', movement: 'Static', angle: 'Eye Level', description: 'OTS Character A' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Over the Shoulder (OTS)', lens: '50mm', movement: 'Static', angle: 'Eye Level', description: 'OTS Character B' },
      ];
    } else if (pendingPresetType === 'action_chase') {
      sequenceShots = [
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Wide Shot (WS)', lens: '18mm', movement: 'Steadicam', angle: 'Low Angle', description: 'Tracking Master' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Medium Shot (MS)', lens: '35mm', movement: 'Handheld', angle: 'Slight Low Angle', description: 'Profile Tracking' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Extreme Close Up (ECU)', lens: 'Macro', movement: 'Whip Pan', angle: 'Ground Level', description: 'Impact Detail' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Point of View (POV)', lens: '24mm', movement: 'Handheld', angle: 'Subjective POV Angle', description: 'Subject Tracking' },
      ];
    } else if (pendingPresetType === 'suspense_tension') {
      sequenceShots = [
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Extreme Wide Shot (EWS)', lens: '12mm', movement: 'Static', angle: 'High Angle', description: 'Isolating Master' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Close Up (CU)', lens: '85mm', movement: 'Push In', angle: 'Eye Level', description: 'Character Reaction (Slow Push)' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Over the Shoulder (OTS)', lens: '35mm', movement: 'Handheld', angle: 'Slight High Angle', description: 'Stalker Perspective' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Extreme Close Up (ECU)', lens: 'Macro', movement: 'Static', angle: 'Ground Level', description: 'Trigger Event' },
      ];
    } else if (pendingPresetType === 'reveal') {
      sequenceShots = [
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Establishing Shot (EST)', lens: '14mm', movement: 'Crane Down', angle: 'Top Down / Overhead', description: 'Overview Reveal' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Insert Shot (INS)', lens: 'Macro', movement: 'Tilt Up', angle: 'Ground Level', description: 'Walk-in Detail' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Cowboy Shot (CS)', lens: '35mm', movement: 'Steadicam', angle: 'Slight Low Angle', description: 'Subject Profile' },
        { ...INITIAL_SHOT_STATE, scene_no: currentScene, shot_size: 'Extreme Close Up (ECU)', lens: '75mm', movement: 'Static', angle: 'Eye Level', description: 'Eyes Reveal (Italian Shot)' },
      ];
    }

    try {
      setSaveStatus('saving');
      const startNo = shots.filter(s => s.scene_no === currentScene).length + 1;
      for (let i = 0; i < sequenceShots.length; i++) {
        await addShotHook({ ...sequenceShots[i], shot_no: (startNo + i).toString() });
      }
      setSaveStatus('saved');
      toast.success('Sequence added');
      setTimeout(() => setSaveStatus('idle'), 2000);
      setIsPresetModalOpen(false);
    } catch (error) { toast.error('Failed to add sequence'); }
  };

  const handleLogoUpload = async (file: File) => {
    if (!project) return;
    try {
      setSaveStatus('saving');
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1080, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const filePath = `logos/${project.id}_${Math.random()}.webp`;

      if (project.company_logo_url) {
        try {
          const urlObj = new URL(project.company_logo_url);
          const pathInBucket = urlObj.pathname.split('/public/logos/')[1];
          if (pathInBucket) await supabase.storage.from('logos').remove([pathInBucket]);
        } catch (e) { console.error('Failed to delete old logo', e); }
      }

      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, compressedFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
      await supabase.from('projects').update({ company_logo_url: publicUrl }).eq('id', project.id);
      setProject({ ...project, company_logo_url: publicUrl });
      setSaveStatus('saved');
      toast.success('Logo updated');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) { toast.error('Logo upload failed'); }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !project) return;

    const { source, destination } = result;
    
    const sourceMatch = source.droppableId.match(/scene-(.*)-(table|gallery)/);
    const destMatch = destination.droppableId.match(/scene-(.*)-(table|gallery)/);
    
    if (!sourceMatch || !destMatch) return;
    
    const sourceSceneNo = sourceMatch[1];
    const destSceneNo = destMatch[1];

    const newGroupedShots = { ...groupedShots };
    const sourceShots = Array.from(newGroupedShots[sourceSceneNo] || []) as Shot[];
    const destShots = sourceSceneNo === destSceneNo ? sourceShots : Array.from(newGroupedShots[destSceneNo] || []) as Shot[];

    const [reorderedItem] = sourceShots.splice(source.index, 1);
    reorderedItem.scene_no = destSceneNo;
    
    destShots.splice(destination.index, 0, reorderedItem);

    const finalItems: Shot[] = [];
    sceneNumbers.forEach(sceneNo => {
      const sceneArray = sceneNo === sourceSceneNo ? sourceShots : 
                         sceneNo === destSceneNo ? destShots : 
                         newGroupedShots[sceneNo] || [];
                         
      sceneArray.forEach((shot, idx) => {
         finalItems.push({ ...shot, shot_no: (idx + 1).toString(), scene_no: sceneNo });
      });
    });

    try {
      setSaveStatus('saving');
      await reorderShotsHook(finalItems);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) { toast.error('Reorder failed'); }
  };

  const exportCSV = () => {
    if (!project) return;
    const headers = ['No', 'Scene', ...exportColumns];
    const rows = shots.map(s => {
      const row = [s.shot_no, s.scene_no];
      exportColumns.forEach(col => {
        if (col === 'Storyboard') row.push(s.storyboard_url ? `"${s.storyboard_url.replace(/"/g, '""')}"` : '');
        if (col === 'Shot Size') row.push(s.shot_size);
        if (col === 'Lens') row.push(s.lens);
        if (col === 'Movement') row.push(s.movement);
        if (col === 'Angle') row.push(s.angle);
        if (col === 'Framing') row.push(s.framing);
        if (col === 'Description') row.push(`"${s.description.replace(/"/g, '""')}"`);
      });
      return row;
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `${project.title}_shotlist.csv`;
    link.click();
    setIsExportModalOpen(false);
  };

  const exportPDF = async () => {
    if (!project) return;
    
    // 1. Asynchronously load and cache all storyboard images if Storyboard is included in exportColumns
    const loadedImages: Record<string, HTMLImageElement | null> = {};
    if (exportColumns.includes('Storyboard')) {
      const imagePromises = shots.map(async (shot) => {
        if (shot.storyboard_url) {
          try {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            // Use cache-busting query parameter to bypass potential CORS cached header issues
            try {
              const urlObj = new URL(shot.storyboard_url);
              urlObj.searchParams.set('cors_bypass', new Date().getTime().toString());
              img.src = urlObj.toString();
            } catch (e) {
              img.src = shot.storyboard_url + `?cors_bypass=${new Date().getTime()}`;
            }
            await new Promise((resolve) => {
              img.onload = () => resolve(img);
              img.onerror = () => resolve(null);
            });
            return { id: shot.id, img };
          } catch (e) {
            return { id: shot.id, img: null };
          }
        }
        return { id: shot.id, img: null };
      });
      const loadedImagesArray = await Promise.all(imagePromises);
      loadedImagesArray.forEach(item => {
        loadedImages[item.id] = item.img;
      });
    }

    // 2. Instantiate jsPDF in landscape format
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth(); // 297
    const pageHeight = doc.internal.pageSize.getHeight(); // 210

    // 3. Draw a premium charcoal banner spanning the entire width
    doc.setFillColor(8, 8, 8); // #080808 (nav background)
    doc.rect(0, 0, pageWidth, 42, 'F');

    // 4. Draw the bottom brand-yellow accent line (1.5mm thickness)
    doc.setFillColor(255, 232, 55); // brand-yellow (#FFE837)
    doc.rect(0, 42, pageWidth, 1.5, 'F');

    // 5. Title "SHYTLIST" in bold cyan
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 202, 255); // brand-cyan (#37CAFF)
    doc.setFontSize(24);
    doc.text('SHYTLIST', 14, 18);

    // Subtitle / Project Name in white
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(`PROJECT: ${project.title.toUpperCase()}`, 14, 27);

    // Crew Info: Director and DP in brand-yellow (as requested)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 232, 55); // brand-yellow (#FFE837)
    doc.setFontSize(9);
    doc.text(`DIR: ${project.director.toUpperCase()}`, 14, 34);
    doc.text(`DP: ${project.dp.toUpperCase()}`, 80, 34);

    // 6. On-Set Production Metrics Grid in the header
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text('SCENES', 140, 16);
    doc.text('SHOTS', 160, 16);
    doc.text('EST. DAY', 180, 16);
    doc.text('FILM RUNTIME', 205, 16);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(`${productionMetrics.sceneCount}`, 140, 24);
    doc.text(`${shots.length}`, 160, 24);
    doc.text(`${productionMetrics.totalDuration}`, 180, 24);
    
    // Highlight edited film runtime in brand-yellow
    doc.setTextColor(255, 232, 55); // brand-yellow
    doc.text(`${productionMetrics.filmDuration}`, 205, 24);

    // 7. Corporate Logo Upload (Top-Right)
    if (project.company_logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = project.company_logo_url;
        await new Promise((res) => { img.onload = res; img.onerror = res; });
        if (img.width > 0) {
          // Render logo nicely aligned on the far right
          doc.addImage(img, 'PNG', pageWidth - 45, 8, 30, 18);
        }
      } catch (e) {}
    }

    // 8. Construct Headers & Body for the Table
    // Map headers to uppercase display titles
    const headHeaders = ['#', 'SCENE'];
    exportColumns.forEach(col => {
      if (col === 'Storyboard') headHeaders.push('STORYBOARD');
      else if (col === 'Shot Size') headHeaders.push('SIZE');
      else headHeaders.push(col.toUpperCase());
    });
    const head = [headHeaders];

    const body = shots.map(s => {
      const row = [s.shot_no, s.scene_no];
      exportColumns.forEach(col => {
        if (col === 'Storyboard') row.push(''); // placeholder, drawn via didDrawCell
        else if (col === 'Shot Size') row.push(s.shot_size);
        else if (col === 'Lens') row.push(s.lens);
        else if (col === 'Movement') row.push(s.movement);
        else if (col === 'Angle') row.push(s.angle);
        else if (col === 'Framing') row.push(s.framing);
        else if (col === 'Description') row.push(s.description);
      });
      return row;
    });

    // 9. Column width mapping
    const colStyles: Record<number, any> = {
      0: { cellWidth: 10, halign: 'center' }, // #
      1: { cellWidth: 14, halign: 'center' }, // SCENE
    };
    headHeaders.forEach((header, index) => {
      if (index < 2) return;
      if (header === 'STORYBOARD') {
        colStyles[index] = { cellWidth: 36, halign: 'center' };
      } else if (header === 'SIZE') {
        colStyles[index] = { cellWidth: 28 };
      } else if (header === 'LENS') {
        colStyles[index] = { cellWidth: 20 };
      } else if (header === 'MOVEMENT') {
        colStyles[index] = { cellWidth: 30 };
      } else if (header === 'ANGLE') {
        colStyles[index] = { cellWidth: 30 };
      } else if (header === 'FRAMING') {
        colStyles[index] = { cellWidth: 26 };
      } else if (header === 'DESCRIPTION') {
        colStyles[index] = { cellWidth: 'auto' };
      }
    });

    // 10. Render AutoTable
    autoTable(doc, {
      startY: 48,
      head,
      body,
      theme: 'grid',
      headStyles: {
        fillColor: [18, 18, 18], // #121212 surface
        textColor: [55, 202, 255], // brand-cyan
        fontSize: 8,
        fontStyle: 'bold',
        font: 'helvetica',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 30, 30],
        font: 'helvetica',
        valign: 'middle',
        // Row height matches storyboards size if included
        minCellHeight: exportColumns.includes('Storyboard') ? 22 : 10
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250] // alternating rows for legibility
      },
      columnStyles: colStyles,
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const colHeader = headHeaders[data.column.index]?.toUpperCase() || '';
          if (colHeader === 'STORYBOARD') {
            const shot = shots[data.row.index];
            if (shot && shot.storyboard_url) {
              const img = loadedImages[shot.id];
              if (img) {
                // Calculate dimensions to preserve 16:9 ratio in the cell
                const paddingX = 2;
                const paddingY = 2;
                const cellX = data.cell.x + paddingX;
                const cellY = data.cell.y + paddingY;
                const cellWidth = data.cell.width - (paddingX * 2);
                const cellHeight = data.cell.height - (paddingY * 2);

                try {
                  doc.addImage(img, 'WEBP', cellX, cellY, cellWidth, cellHeight);
                } catch (err) {
                  // Fallback to JPEG if WEBP fails, or draw placeholder
                  try {
                    doc.addImage(img, 'JPEG', cellX, cellY, cellWidth, cellHeight);
                  } catch (e) {
                    doc.setFontSize(6);
                    doc.setTextColor(150, 150, 150);
                    doc.text('IMAGE ERR', data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2), { align: 'center' });
                  }
                }
              } else {
                doc.setFontSize(6);
                doc.setTextColor(150, 150, 150);
                doc.text('NO VISUAL', data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2), { align: 'center' });
              }
            } else {
              doc.setFontSize(6);
              doc.setTextColor(150, 150, 150);
              doc.text('NO VISUAL', data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2), { align: 'center' });
            }
          }
        }
      }
    });

    doc.save(`${project.title}_shotlist.pdf`);
    setIsExportModalOpen(false);
  };

  if (!project) return null;

  return (
    <>
      <Helmet>
        <title>{project ? `${project.title} | Shotlist Editor - Shytlist` : "Shotlist Editor - Shytlist"}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex flex-col h-full bg-zinc-950/20 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative z-10">
      <div className="flex h-full flex-1 overflow-hidden">
        {/* Sidebar Project Info */}
        <aside className="w-72 bg-black/15 border-r border-white/5 p-6 hidden lg:flex flex-col gap-8 overflow-y-auto backdrop-blur-md">
          <div className="space-y-4">
            <button 
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors duration-300 text-xs font-semibold uppercase tracking-widest"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </button>
            <div className="pt-2">
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
                    <button onClick={saveProjectInfo} className="btn-primary flex-1 py-2 text-xs">Save Changes</button>
                    <button onClick={() => { setTempName(project.title || ''); setTempDirector(project.director || ''); setTempDp(project.dp || ''); setIsEditingInfo(false); }} className="btn-outline flex-1 py-2 text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="cursor-pointer group/info relative" onClick={() => setIsEditingInfo(true)}>
                  <div className="absolute -inset-2 rounded-xl bg-white/[0.02] opacity-0 group-hover/info:opacity-100 transition-opacity"></div>
                  <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white group-hover/info:text-brand-cyan transition-colors duration-700 relative z-10">{project.title}</h2>
                  <p className="text-brand-yellow font-semibold mt-1 relative z-10 text-xs">Dir. {project.director}</p>
                  <p className="text-zinc-500 text-xs font-semibold relative z-10">DP. {project.dp}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* PRODUCTION ESTIMATE DASHBOARD */}
            <div className="p-1 bg-white/[0.01] border border-white/5 rounded-[1.5rem]">
              <div className="p-5 bg-zinc-900/40 rounded-[calc(1.5rem-0.25rem)] border border-white/10 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Clock className="w-3.5 h-3.5 text-brand-cyan" />
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Production Estimate</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Shooting</span>
                    <p className="text-xs font-bold text-white">{productionMetrics.shootingDuration}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Setups</span>
                    <p className="text-xs font-bold text-zinc-400">{productionMetrics.setupDuration}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Trans.</span>
                    <p className="text-xs font-bold text-zinc-400">{productionMetrics.transitionDuration}</p>
                  </div>
                </div>
                <div className="pt-1 space-y-2">
                  <div className="bg-brand-cyan/5 rounded-xl p-3 border border-brand-cyan/10">
                    <span className="text-[9px] text-brand-cyan font-bold uppercase tracking-widest block mb-0.5">Estimated Day</span>
                    <p className="text-xl font-bold text-white tracking-tight">{productionMetrics.totalDuration}</p>
                  </div>
                  <div className="bg-brand-yellow/5 rounded-xl p-3 border border-brand-yellow/10">
                    <span className="text-[9px] text-brand-yellow font-bold uppercase tracking-widest block mb-0.5">Film Duration</span>
                    <p className="text-xl font-bold text-white tracking-tight">{productionMetrics.filmDuration}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-t border-white/5 pt-2">
                  <span>{productionMetrics.sceneCount} Scenes</span>
                  <span>{shots.length} Shots</span>
                </div>
              </div>
            </div>

            {/* BRANDING LOGO */}
            <div className="p-1 bg-white/[0.01] border border-white/5 rounded-[1.5rem]">
              <div className="p-5 bg-zinc-900/40 rounded-[calc(1.5rem-0.25rem)] border border-white/10 space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-white/5 pb-2">Production Branding</p>
                <div 
                  className="aspect-video bg-zinc-950 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-yellow/30 transition-all duration-500 group overflow-hidden relative"
                  onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) handleLogoUpload(file); }; input.click(); }}
                >
                  {project.company_logo_url ? <img src={project.company_logo_url} alt="Logo" className="w-full h-full object-contain p-4" /> : <> <Upload className="w-4 h-4 text-zinc-600 group-hover:text-brand-yellow transition-colors" /> <span className="text-[10px] text-zinc-600 font-bold uppercase">Upload Logo</span> </>}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"> <span className="text-[10px] text-white font-bold uppercase">Change Logo</span> </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">Export & Share</p>
              <button onClick={() => setIsExportModalOpen(true)} className="btn-primary w-full justify-center gap-3 py-3 font-semibold rounded-full"> <FileArrowDown className="w-4 h-4" /> <span>Export Settings</span> </button>
            </div>

            <div className="p-1 bg-white/[0.01] border border-white/5 rounded-[1.5rem]">
              <div className="p-5 bg-zinc-900/40 rounded-[calc(1.5rem-0.25rem)] border border-white/10 space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-white/5 pb-2">Quick Presets</p>
                <div className="space-y-2">
                  {[
                    { type: 'master_coverage', label: 'Establish', sub: '3 shots (WS, 2x MS)' },
                    { type: 'overs_tows', label: 'Dialogue', sub: '3 shots (2S, 2x OTS)' },
                    { type: 'action_chase', label: 'Action', sub: '4 shots (WS, MS, ECU, POV)' },
                    { type: 'suspense_tension', label: 'Suspense', sub: '4 shots (EWS, CU, OTS, ECU)' },
                    { type: 'reveal', label: 'Reveal', sub: '4 shots (EST, INS, CS, ECU)' }
                  ].map(p => (
                    <button key={p.type} onClick={() => addSequence(p.type as any)} className="w-full bg-zinc-950 border border-white/5 hover:border-brand-cyan/30 text-white rounded-xl p-2.5 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group flex items-center gap-3 text-left">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center group-hover:bg-brand-cyan/10 transition-colors"> <Copy className="w-3.5 h-3.5 text-brand-cyan" /> </div>
                      <div> <p className="text-[9px] font-bold text-white uppercase tracking-wider">{p.label}</p> <p className="text-[8px] text-zinc-500 font-semibold">{p.sub}</p> </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Editor Section */}
        <section className="flex-1 flex flex-col bg-transparent overflow-hidden">
          {/* Mobile Header */}
          <div className="lg:hidden p-6 bg-black/20 backdrop-blur-md border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <button onClick={() => navigate('/projects')} className="text-zinc-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
               <h2 className="text-lg font-semibold text-white tracking-tight truncate max-w-[200px]">{project.title}</h2>
            </div>
            <div className="flex gap-2">
               <button onClick={exportPDF} className="p-2 bg-zinc-900 rounded-lg border border-white/5 text-brand-yellow"><FileArrowDown className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="px-6 md:px-8 py-4 bg-black/15 backdrop-blur-md border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl border border-white/5 w-full sm:w-auto overflow-x-auto">
              <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-brand-cyan text-black' : 'text-zinc-500 hover:text-white'}`}> <List className="w-4 h-4" /> Table View </button>
              <button onClick={() => setViewMode('gallery')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'gallery' ? 'bg-brand-cyan text-black' : 'text-zinc-500 hover:text-white'}`}> <SquaresFour className="w-4 h-4" /> Gallery View </button>
            </div>
            <div className="flex items-center gap-4"> <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Showing {shots.length} Shots</span> </div>
          </div>

          <div className="px-8 py-6 bg-black/10 border-b border-white/5">
            <form onSubmit={addShot} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-3 items-end">
              <div className="md:col-span-1"> <label className="label-micro">Scene</label> <select className="input-field h-[42px]" value={newShot.scene_no} onChange={e => setNewShot(prev => ({ ...prev, scene_no: e.target.value }))}> {OPTIONS.scene.map(o => <option key={o} value={o}>{o}</option>)} </select> </div>
              <div className="md:col-span-1"> <label className="label-micro">Shot #</label> <select className="input-field h-[42px]" value={newShot.shot_no} onChange={e => setNewShot(prev => ({ ...prev, shot_no: e.target.value }))}> {OPTIONS.no.map(o => <option key={o} value={o}>{o}</option>)} </select> </div>
              <div className="md:col-span-2"> <label className="label-micro">Size</label> <select className="input-field h-[42px]" value={newShot.shot_size} onChange={e => setNewShot(prev => ({ ...prev, shot_size: e.target.value }))}> {OPTIONS.shot_size.map(o => <option key={o} value={o}>{o}</option>)} </select> </div>
              <div className="md:col-span-1"> <label className="label-micro">Lens</label> <select className="input-field h-[42px]" value={newShot.lens} onChange={e => setNewShot(prev => ({ ...prev, lens: e.target.value }))}> {OPTIONS.lens.map(o => <option key={o} value={o}>{o}</option>)} </select> </div>
              <div className="md:col-span-2"> <label className="label-micro">Movement</label> <select className="input-field h-[42px]" value={newShot.movement} onChange={e => setNewShot(prev => ({ ...prev, movement: e.target.value }))}> {OPTIONS.movement.map(o => <option key={o} value={o}>{o}</option>)} </select> </div>
              <div className="md:col-span-1"> <label className="label-micro">Angle</label> <select className="input-field h-[42px]" value={newShot.angle} onChange={e => setNewShot(prev => ({ ...prev, angle: e.target.value }))}> {OPTIONS.angle.map(o => <option key={o} value={o}>{o}</option>)} </select> </div>
              <div className="md:col-span-1"> <label className="label-micro">Framing</label> <select className="input-field h-[42px]" value={newShot.framing || 'Rule of Thirds'} onChange={e => setNewShot(prev => ({ ...prev, framing: e.target.value }))}> {OPTIONS.framing.map(o => <option key={o} value={o}>{o}</option>)} </select> </div>
              <div className="md:col-span-2"> <label className="label-micro">Description</label> <input required className="input-field h-[42px]" value={newShot.description} onChange={e => setNewShot(prev => ({ ...prev, description: e.target.value }))} placeholder="Shot details..." /> </div>
              <div className="md:col-span-1"> <button type="submit" className="w-full bg-brand-yellow hover:bg-yellow-400 text-black font-semibold rounded-lg h-[42px] flex items-center justify-center transition-all shadow-lg shadow-brand-yellow/10"> <Plus className="w-5 h-5" /> </button> </div>
            </form>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-12 pb-20">
                {sceneNumbers.map(sceneNo => {
                  const sceneShots = groupedShots[sceneNo];
                  const isCollapsed = collapsedScenes[sceneNo];
                  return (
                    <div key={sceneNo} className="space-y-4">
                      <button onClick={() => toggleScene(sceneNo)} className="flex items-center gap-4 group/scene w-full text-left">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 text-zinc-500 group-hover/scene:border-brand-cyan/50 transition-all"> {isCollapsed ? <CaretRight /> : <CaretDown />} </div>
                        <div> <h3 className="text-xl font-bold text-white tracking-tight">Scene {sceneNo}</h3> <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{sceneShots.length} Shots in Scene</p> </div>
                        <div className="flex-1 h-px bg-white/5"></div>
                      </button>
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                            className="overflow-hidden"
                          >
                            <AnimatePresence mode="wait">
                              {viewMode === 'table' ? (
                                <motion.div
                                  key="table"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                    <div className="w-full rounded-2xl border border-white/5 bg-zinc-900/10 backdrop-blur-sm overflow-x-auto shadow-xl">
                                      <div className="min-w-[1050px] flex flex-col">
                                        {/* Header */}
                                        <div className="bg-zinc-900/50 border-b border-white/5 flex items-center text-[10px] uppercase tracking-widest text-zinc-500 font-semibold py-4">
                                          <div className="px-2 w-10 flex-shrink-0"></div>
                                          <div className="px-2 w-10 flex-shrink-0 text-brand-cyan">#</div>
                                          <div className="px-4 w-36 flex-shrink-0">Storyboard</div>
                                          <div className="px-4 w-32 flex-shrink-0">Size</div>
                                          <div className="px-4 w-20 flex-shrink-0">Lens</div>
                                          <div className="px-4 w-32 flex-shrink-0">Movement</div>
                                          <div className="px-4 w-32 flex-shrink-0">Angle</div>
                                          <div className="px-4 w-28 flex-shrink-0">Framing</div>
                                          <div className="px-4 flex-1">Description</div>
                                          <div className="px-4 w-24 flex-shrink-0 text-right pr-8">Actions</div>
                                        </div>

                                        {/* Body */}
                                        <Droppable droppableId={`scene-${sceneNo}-table`}>
                                          {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col">
                                              {sceneShots.map((shot, index) => (
                                                <DraggableAny key={shot.id} draggableId={shot.id} index={index}>
                                                  {(p: any, s: any) => renderDraggable((provided: any, snapshot: any) => (
                                                    <div
                                                      ref={provided.innerRef}
                                                      {...provided.draggableProps}
                                                      style={{ ...provided.draggableProps.style, backgroundColor: snapshot.isDragging ? 'rgba(55, 202, 255, 0.05)' : '' }}
                                                      className={`group hover:bg-white/[0.02] border-b border-white/[0.03] last:border-b-0 flex items-center transition-colors duration-150 py-3 ${snapshot.isDragging ? 'border-brand-cyan/50' : ''}`}
                                                    >
                                                      <div className="px-2 w-10 flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing" {...provided.dragHandleProps}>
                                                        <DotsSixVertical size={20} className="text-zinc-400 group-hover:text-brand-cyan transition-colors duration-200 mx-auto" />
                                                      </div>
                                                      <div className="px-2 w-10 flex-shrink-0 text-zinc-300 text-sm font-semibold mono">{shot.shot_no}</div>
                                                      <div className="px-4 w-36 flex-shrink-0">
                                                        <div className="w-28 h-16 bg-zinc-800 rounded-lg border border-white/5 overflow-hidden flex items-center justify-center cursor-pointer hover:border-brand-cyan/50 transition-colors duration-200 active:scale-[0.97] group/sb relative" onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) handleImageUpload(shot.id, file); }; input.click(); }}>
                                                          {shot.storyboard_url ? <img src={shot.storyboard_url} alt="Storyboard" className="w-full h-full object-cover" /> : <ImageIcon className="text-zinc-600 group-hover/sb:text-brand-cyan" />}
                                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/sb:opacity-100 flex items-center justify-center transition-opacity"><Upload className="w-3 h-3 text-white" /></div>
                                                        </div>
                                                      </div>
                                                      <div className="px-4 w-32 flex-shrink-0 text-[10px] font-semibold text-zinc-300 uppercase">{shot.shot_size}</div>
                                                      <div className="px-4 w-20 flex-shrink-0 text-sm font-medium text-zinc-400 mono">{shot.lens}</div>
                                                      <div className="px-4 w-32 flex-shrink-0 text-sm font-medium text-zinc-500">{shot.movement}</div>
                                                      <div className="px-4 w-32 flex-shrink-0 text-sm font-medium text-zinc-500">{shot.angle}</div>
                                                      <div className="px-4 w-28 flex-shrink-0 text-sm font-medium text-zinc-500">{shot.framing || 'Rule of Thirds'}</div>
                                                      <div className="px-4 flex-1 text-sm text-zinc-300 font-medium leading-relaxed">{shot.description}</div>
                                                      <div className="px-4 w-24 flex-shrink-0 text-right pr-8 flex items-center justify-end">
                                                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100">
                                                          <button onClick={()=>setEditingShot(shot)} className="hover:text-brand-cyan"><PencilSimple/></button>
                                                          <button onClick={()=>deleteShot(shot.id)} className="hover:text-red-400"><Trash/></button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))(p, s)}
                                                </DraggableAny>
                                              ))}
                                              {provided.placeholder}
                                            </div>
                                          )}
                                        </Droppable>
                                      </div>
                                    </div>
                                  </motion.div>
                              ) : (
                                <motion.div
                                  key="gallery"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                                >
                                  <Droppable droppableId={`scene-${sceneNo}-gallery`} direction="horizontal">
                                    {(provided) => (
                                      <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                        {sceneShots.map((shot, index) => (
                                          <DraggableAny key={shot.id} draggableId={shot.id} index={index}>
                                            {(p: any, s: any) => renderDraggable((provided: any, snapshot: any) => (
                                              <div ref={provided.innerRef} {...provided.draggableProps} className={`p-1 bg-white/[0.01] border border-white/5 rounded-[1.5rem] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group h-full ${snapshot.isDragging ? 'ring-2 ring-brand-cyan' : ''}`}>
                                                <div className="bg-zinc-950 border border-white/10 rounded-[calc(1.5rem-0.25rem)] overflow-hidden flex flex-col h-full">
                                                  <div className="aspect-video bg-zinc-900 relative cursor-pointer" onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) handleImageUpload(shot.id, file); }; input.click(); }}>
                                                    {shot.storyboard_url ? <img src={shot.storyboard_url} alt="Storyboard" className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center gap-2"><ImageIcon className="w-6 h-6 text-zinc-700" /><span className="text-[10px] text-zinc-600 font-bold uppercase">No Visual</span></div>}
                                                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-[10px] font-bold text-brand-cyan mono">#{shot.shot_no}</div>
                                                    <div {...provided.dragHandleProps} className="absolute top-3 right-3 p-1.5 bg-black/60 backdrop-blur-md rounded-md text-zinc-400 hover:text-brand-cyan transition-colors cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"><DotsSixVertical size={18} /></div>
                                                  </div>
                                                  <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                                                    <div className="flex justify-between items-start gap-2"> <div><p className="text-[10px] font-bold text-zinc-300 uppercase">{shot.shot_size}</p><p className="text-[10px] text-zinc-500 font-medium uppercase min-h-[24px] line-clamp-2">{shot.lens} • {shot.movement} • {shot.angle} • {shot.framing || 'Rule of Thirds'}</p></div> <div className="flex gap-1 opacity-0 group-hover:opacity-100"><button onClick={()=>setEditingShot(shot)} className="hover:text-brand-cyan"><PencilSimple size={14}/></button><button onClick={()=>deleteShot(shot.id)} className="hover:text-red-400"><Trash size={14}/></button></div> </div>
                                                    <p className="text-xs text-zinc-400 font-medium leading-relaxed line-clamp-3 h-12">{shot.description}</p>
                                                  </div>
                                                </div>
                                              </div>
                                            ))(p, s)}
                                          </DraggableAny>
                                        ))}
                                        {provided.placeholder}
                                      </div>
                                    )}
                                  </Droppable>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          </div>
        </section>
      </div>

      {createPortal(
        <AnimatePresence>
          {isExportModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsExportModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full max-w-md glass border border-white/10 p-12 rounded-[2.5rem] shadow-2xl overflow-hidden text-left"
              >
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="absolute top-6 right-6 p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-8">
                  <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Export Selection</h2>
                  <p className="text-zinc-500 text-sm">Select columns to include in your export.</p>
                </div>

                <div className="space-y-4 mb-8">
                  {ALL_COLUMNS.map(col => (
                    <label key={col} className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={exportColumns.includes(col)}
                        onChange={() => setExportColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
                      />
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${exportColumns.includes(col) ? 'bg-brand-cyan border-brand-cyan' : 'border-zinc-700'}`}>
                        {exportColumns.includes(col) && <CheckCircle weight="fill" size={14} className="text-black" />}
                      </div>
                      <span className="text-sm font-medium text-zinc-300">{col}</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button onClick={exportPDF} className="btn-primary flex-1 py-4 font-bold cursor-pointer">PDF</button>
                  <button onClick={exportCSV} className="btn-outline flex-1 py-4 font-bold cursor-pointer">CSV</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {editingShot && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingShot(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full max-w-2xl glass border border-white/10 p-12 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto text-left"
              >
                <button
                  onClick={() => setEditingShot(null)}
                  className="absolute top-6 right-6 p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-10">
                  <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Edit Shot #{editingShot.shot_no}</h2>
                  <p className="text-zinc-500 text-sm">Adjust shot parameters and description.</p>
                </div>

                <form onSubmit={updateShot} className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="label-micro block text-left font-medium">Scene</label>
                      <select className="input-field bg-black/50" value={editingShot.scene_no} onChange={e => setEditingShot({ ...editingShot, scene_no: e.target.value })}>
                        {OPTIONS.scene.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-micro block text-left font-medium">Shot #</label>
                      <select className="input-field bg-black/50" value={editingShot.shot_no} onChange={e => setEditingShot({ ...editingShot, shot_no: e.target.value })}>
                        {OPTIONS.no.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-micro block text-left font-medium">Size</label>
                      <select className="input-field bg-black/50" value={editingShot.shot_size} onChange={e => setEditingShot({ ...editingShot, shot_size: e.target.value })}>
                        {OPTIONS.shot_size.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-micro block text-left font-medium">Lens</label>
                      <select className="input-field bg-black/50" value={editingShot.lens} onChange={e => setEditingShot({ ...editingShot, lens: e.target.value })}>
                        {OPTIONS.lens.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-micro block text-left font-medium">Movement</label>
                      <select className="input-field bg-black/50" value={editingShot.movement} onChange={e => setEditingShot({ ...editingShot, movement: e.target.value })}>
                        {OPTIONS.movement.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-micro block text-left font-medium">Angle</label>
                      <select className="input-field bg-black/50" value={editingShot.angle} onChange={e => setEditingShot({ ...editingShot, angle: e.target.value })}>
                        {OPTIONS.angle.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-micro block text-left font-medium">Framing</label>
                      <select className="input-field bg-black/50" value={editingShot.framing || 'Rule of Thirds'} onChange={e => setEditingShot({ ...editingShot, framing: e.target.value })}>
                        {OPTIONS.framing.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="label-micro block text-left font-medium">Description</label>
                      <textarea className="input-field bg-black/50 min-h-[100px] py-3" value={editingShot.description} onChange={e => setEditingShot({ ...editingShot, description: e.target.value })} required />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="btn-primary flex-1 py-4 font-bold cursor-pointer">Save Changes</button>
                    <button type="button" onClick={() => setEditingShot(null)} className="btn-outline px-12 py-4 font-bold cursor-pointer">Cancel</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {isPresetModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPresetModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full max-w-md glass border border-white/10 p-12 rounded-[2.5rem] shadow-2xl overflow-hidden text-left"
              >
                <button
                  onClick={() => setIsPresetModalOpen(false)}
                  className="absolute top-6 right-6 p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-8">
                  <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Add Preset</h2>
                  <p className="text-zinc-500 text-sm">Add a preset block of shots to a scene.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="label-micro block text-left font-medium">Select Scene</label>
                    <select className="input-field bg-black/50" value={presetSceneNo} onChange={e => setPresetSceneNo(e.target.value)}>
                      {OPTIONS.scene.map(o => <option key={o} value={o}>Scene {o}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={confirmAddSequence} className="btn-primary flex-1 py-4 font-bold cursor-pointer">Confirm</button>
                  </div>
                </div>
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
