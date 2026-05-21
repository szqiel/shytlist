import { useMemo } from 'react';
import { Shot } from '../types';
import { Clock } from '@phosphor-icons/react';

interface ProductionMetricsProps {
  shots: Shot[];
  sceneNumbers: string[];
}

const SIZE_TAKE_DURATION: Record<string, number> = {
  "Extreme Wide Shot": 45, "Wide Shot": 45, "Group Shot": 45,
  "Full Shot": 30, "Cowboy Shot": 30, "Medium Full Shot": 30,
  "Medium Shot": 20, "Medium Close Up": 20,
  "Over the Shoulder": 25, "Two Shot": 25,
  "Close Up": 15, "Point of View": 15,
  "Extreme Close Up": 8, "Insert": 8,
};

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

export function ProductionMetrics({ shots, sceneNumbers }: ProductionMetricsProps) {
  const metrics = useMemo(() => {
    const shootingMinutes = shots.reduce((sum, shot) => sum + calculateShootingDuration(shot), 0);
    const setupMinutes = shots.reduce((sum, shot) => sum + calculateShotDuration(shot), 0);
    const sceneCount = sceneNumbers.length;
    const transitionMinutes = Math.max(0, (sceneCount - 1) * 10);
    const totalMinutes = shootingMinutes + setupMinutes + transitionMinutes;
    const filmSeconds = shots.reduce((sum, shot) => sum + estimateFilmDuration(shot), 0);
    
    const formatMin = (m: number) => {
      const h = Math.floor(m / 60);
      const r = m % 60;
      if (h > 0) return `${h}h ${r}m`;
      return `${r}m`;
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

  return (
    <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-5">
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <Clock className="w-3.5 h-3.5 text-brand-cyan" />
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Production Estimate</p>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Shooting</span>
          <p className="text-sm font-semibold text-white">{metrics.shootingDuration}</p>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Setups</span>
          <p className="text-sm font-semibold text-zinc-400">{metrics.setupDuration}</p>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Transitions</span>
          <p className="text-sm font-semibold text-zinc-400">{metrics.transitionDuration}</p>
        </div>
      </div>

      <div className="pt-2 space-y-3">
        <div className="bg-brand-cyan/5 rounded-xl p-3 border border-brand-cyan/10">
          <span className="text-[9px] text-brand-cyan font-bold uppercase tracking-widest block mb-1">Estimated Day</span>
          <p className="text-2xl font-bold text-white tracking-tight">{metrics.totalDuration}</p>
        </div>
        <div className="bg-brand-yellow/5 rounded-xl p-3 border border-brand-yellow/10">
          <span className="text-[9px] text-brand-yellow font-bold uppercase tracking-widest block mb-1">Film Duration</span>
          <p className="text-2xl font-bold text-white tracking-tight">{metrics.filmDuration}</p>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
        <span>{metrics.sceneCount} Scenes</span>
        <span>{shots.length} Shots</span>
      </div>
    </div>
  );
}
