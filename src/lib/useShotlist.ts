import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { Shot } from '../types';
import { toast } from 'sonner';

export function useShotlist(projectId: string | undefined) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShots = useCallback(async () => {
    if (!projectId) return;
    try {
      const { data, error } = await supabase
        .from('shots')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_no', { ascending: true })
        .order('shot_no', { ascending: true });

      if (error) throw error;
      setShots(data || []);
    } catch (err) {
      console.error('Error fetching shots:', err);
      toast.error('Failed to load shotlist');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Real-time subscription
  useEffect(() => {
    if (!projectId) return;

    fetchShots();

    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel(`project-shots-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shots',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchShots();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchShots]);

  const addShot = async (newShot: Omit<Shot, 'id' | 'project_id'>) => {
    if (!projectId) return;
    try {
      const { error } = await supabase
        .from('shots')
        .insert([{ ...newShot, project_id: projectId }]);
      if (error) throw error;
      toast.success('Shot added');
    } catch (err) {
      toast.error('Failed to add shot');
      throw err;
    }
  };

  const updateShot = async (shot: Shot) => {
    try {
      const { error } = await supabase
        .from('shots')
        .update(shot)
        .eq('id', shot.id);
      if (error) throw error;
      toast.success('Shot updated');
    } catch (err) {
      toast.error('Failed to update shot');
      throw err;
    }
  };

  const deleteShot = async (shotId: string) => {
    try {
      const { error } = await supabase
        .from('shots')
        .delete()
        .eq('id', shotId);
      if (error) throw error;
      toast.success('Shot deleted');
    } catch (err) {
      toast.error('Failed to delete shot');
      throw err;
    }
  };

  const reorderShots = async (reorderedShots: Shot[]) => {
    const previousShots = [...shots];
    setShots(reorderedShots);

    try {
      const ids = reorderedShots.map(s => s.id);
      const shotNos = reorderedShots.map(s => s.shot_no);
      const sceneNos = reorderedShots.map(s => s.scene_no);

      const { error } = await supabase.rpc('reorder_shots', {
        p_shot_ids: ids,
        p_shot_numbers: shotNos,
        p_scene_numbers: sceneNos
      });

      if (error) throw error;
    } catch (err) {
      console.error('Reorder error:', err);
      toast.error('Failed to save order');
      setShots(previousShots);
    }
  };

  return {
    shots,
    loading,
    addShot,
    updateShot,
    deleteShot,
    reorderShots,
    refresh: fetchShots
  };
}
