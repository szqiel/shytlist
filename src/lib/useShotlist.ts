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
        .eq('project_id', projectId);

      if (error) throw error;

      const sorted = (data || []).sort((a, b) => {
        const sceneA = parseInt(a.scene_no) || 0;
        const sceneB = parseInt(b.scene_no) || 0;
        if (sceneA !== sceneB) return sceneA - sceneB;
        const shotA = parseInt(a.shot_no) || 0;
        const shotB = parseInt(b.shot_no) || 0;
        return shotA - shotB;
      });

      setShots(sorted);
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

    // 1. Filter existing shots in the same scene and sort numerically
    const sceneShots = shots
      .filter(s => s.scene_no === newShot.scene_no)
      .sort((a, b) => parseInt(a.shot_no) - parseInt(b.shot_no));

    const requestedNum = parseInt(newShot.shot_no);

    const tempId = `temp-${Math.random()}`;
    const tempShot: Shot = {
      ...newShot,
      id: tempId,
      project_id: projectId,
      created_at: new Date().toISOString()
    };

    // 2. Insert the new shot at the correct index (requestedNum - 1)
    const newSceneShots = [...sceneShots];
    const insertIndex = Math.min(newSceneShots.length, Math.max(0, requestedNum - 1));
    newSceneShots.splice(insertIndex, 0, tempShot);

    // 3. Assign sequential numbers
    const updatedSceneShots = newSceneShots.map((shot, idx) => ({
      ...shot,
      shot_no: (idx + 1).toString()
    }));

    // 4. Update local state optimistically
    const otherShots = shots.filter(s => s.scene_no !== newShot.scene_no);
    const optimisticAllShots = [...otherShots, ...updatedSceneShots].sort((a, b) => {
      if (a.scene_no !== b.scene_no) return parseInt(a.scene_no) - parseInt(b.scene_no);
      return parseInt(a.shot_no) - parseInt(b.shot_no);
    });

    setShots(optimisticAllShots);

    try {
      const finalNewShotNum = updatedSceneShots.find(s => s.id === tempId)?.shot_no || newShot.shot_no;

      // 5. Insert new shot into the database
      const { data, error } = await supabase
        .from('shots')
        .insert([{ ...newShot, shot_no: finalNewShotNum, project_id: projectId }])
        .select();

      if (error) throw error;

      const insertedShot = data?.[0];
      if (!insertedShot) throw new Error("No data returned");

      // 6. Update shifted existing shots in database
      const shiftsToUpdate = updatedSceneShots
        .filter(s => s.id !== tempId)
        .map(s => {
          const original = sceneShots.find(orig => orig.id === s.id);
          if (original && original.shot_no !== s.shot_no) {
            return s;
          }
          return null;
        })
        .filter(Boolean) as Shot[];

      if (shiftsToUpdate.length > 0) {
        const ids = shiftsToUpdate.map(s => s.id);
        const shotNos = shiftsToUpdate.map(s => s.shot_no);
        const sceneNos = shiftsToUpdate.map(s => s.scene_no);

        const { error: rpcError } = await supabase.rpc('reorder_shots', {
          p_shot_ids: ids,
          p_shot_numbers: shotNos,
          p_scene_numbers: sceneNos
        });
        if (rpcError) throw rpcError;
      }

      setShots(prev => prev.map(s => s.id === tempId ? insertedShot : s));
      toast.success('Shot added');
    } catch (err) {
      console.error('Add shot error:', err);
      fetchShots();
      toast.error('Failed to add shot');
      throw err;
    }
  };

  const updateShot = async (updatedShot: Shot) => {
    const originalShot = shots.find(s => s.id === updatedShot.id);
    if (!originalShot) return;

    const sceneChanged = originalShot.scene_no !== updatedShot.scene_no;
    const numChanged = originalShot.shot_no !== updatedShot.shot_no;

    if (sceneChanged || numChanged) {
      // Re-sequence target and source scenes
      const otherShots = shots.filter(s => s.id !== updatedShot.id);

      // Resequence target scene
      const targetSceneShots = otherShots
        .filter(s => s.scene_no === updatedShot.scene_no)
        .sort((a, b) => parseInt(a.shot_no) - parseInt(b.shot_no));

      const reqNum = parseInt(updatedShot.shot_no);
      const insertIndex = Math.min(targetSceneShots.length, Math.max(0, reqNum - 1));
      targetSceneShots.splice(insertIndex, 0, updatedShot);

      const resequencedTarget = targetSceneShots.map((s, idx) => ({
        ...s,
        shot_no: (idx + 1).toString()
      }));

      // Resequence source scene if scene changed to close the gap
      let resequencedSource: Shot[] = [];
      if (sceneChanged) {
        const sourceSceneShots = otherShots
          .filter(s => s.scene_no === originalShot.scene_no)
          .sort((a, b) => parseInt(a.shot_no) - parseInt(b.shot_no));
        resequencedSource = sourceSceneShots.map((s, idx) => ({
          ...s,
          shot_no: (idx + 1).toString()
        }));
      }

      const finalShotsList = [
        ...otherShots.filter(s => s.scene_no !== updatedShot.scene_no && s.scene_no !== originalShot.scene_no),
        ...resequencedTarget,
        ...resequencedSource
      ].sort((a, b) => {
        if (a.scene_no !== b.scene_no) return parseInt(a.scene_no) - parseInt(b.scene_no);
        return parseInt(a.shot_no) - parseInt(b.shot_no);
      });

      setShots(finalShotsList);

      try {
        const dbUpdatedShot = resequencedTarget.find(s => s.id === updatedShot.id) || updatedShot;
        const { error } = await supabase
          .from('shots')
          .update(dbUpdatedShot)
          .eq('id', updatedShot.id);

        if (error) throw error;

        // Stage updates for any shifted shots in target or source
        const shiftsToUpdate: Shot[] = [];
        resequencedTarget.forEach(s => {
          if (s.id !== updatedShot.id) {
            const original = shots.find(orig => orig.id === s.id);
            if (original && original.shot_no !== s.shot_no) {
              shiftsToUpdate.push(s);
            }
          }
        });
        resequencedSource.forEach(s => {
          const original = shots.find(orig => orig.id === s.id);
          if (original && (original.shot_no !== s.shot_no || original.scene_no !== s.scene_no)) {
            shiftsToUpdate.push(s);
          }
        });

        if (shiftsToUpdate.length > 0) {
          const ids = shiftsToUpdate.map(s => s.id);
          const shotNos = shiftsToUpdate.map(s => s.shot_no);
          const sceneNos = shiftsToUpdate.map(s => s.scene_no);

          const { error: rpcError } = await supabase.rpc('reorder_shots', {
            p_shot_ids: ids,
            p_shot_numbers: shotNos,
            p_scene_numbers: sceneNos
          });
          if (rpcError) throw rpcError;
        }
        toast.success('Shot updated');
      } catch (err) {
        console.error('Update shot re-sequence error:', err);
        fetchShots();
        toast.error('Failed to update shot');
        throw err;
      }
    } else {
      // Basic update (no position shifting)
      const previousShots = [...shots];
      setShots(prev => prev.map(s => s.id === updatedShot.id ? updatedShot : s));

      try {
        const { error } = await supabase
          .from('shots')
          .update(updatedShot)
          .eq('id', updatedShot.id);
        if (error) throw error;
        toast.success('Shot updated');
      } catch (err) {
        setShots(previousShots);
        toast.error('Failed to update shot');
        throw err;
      }
    }
  };

  const deleteShot = async (shotId: string) => {
    const deletedShot = shots.find(s => s.id === shotId);
    if (!deletedShot) return;

    const previousShots = [...shots];

    // Resequence the source scene to close the deletion gap
    const otherShots = shots.filter(s => s.id !== shotId);
    const sceneShots = otherShots
      .filter(s => s.scene_no === deletedShot.scene_no)
      .sort((a, b) => parseInt(a.shot_no) - parseInt(b.shot_no));

    const resequencedScene = sceneShots.map((s, idx) => ({
      ...s,
      shot_no: (idx + 1).toString()
    }));

    const finalShotsList = [
      ...otherShots.filter(s => s.scene_no !== deletedShot.scene_no),
      ...resequencedScene
    ].sort((a, b) => {
      if (a.scene_no !== b.scene_no) return parseInt(a.scene_no) - parseInt(b.scene_no);
      return parseInt(a.shot_no) - parseInt(b.shot_no);
    });

    setShots(finalShotsList);

    try {
      const { error } = await supabase
        .from('shots')
        .delete()
        .eq('id', shotId);
      if (error) throw error;

      // Update shifted existing shot numbers in database
      const shiftsToUpdate = resequencedScene.filter(s => {
        const original = shots.find(orig => orig.id === s.id);
        return original && original.shot_no !== s.shot_no;
      });

      if (shiftsToUpdate.length > 0) {
        const ids = shiftsToUpdate.map(s => s.id);
        const shotNos = shiftsToUpdate.map(s => s.shot_no);
        const sceneNos = shiftsToUpdate.map(s => s.scene_no);

        const { error: rpcError } = await supabase.rpc('reorder_shots', {
          p_shot_ids: ids,
          p_shot_numbers: shotNos,
          p_scene_numbers: sceneNos
        });
        if (rpcError) throw rpcError;
      }
      toast.success('Shot deleted');
    } catch (err) {
      console.error('Delete shot error:', err);
      setShots(previousShots);
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
