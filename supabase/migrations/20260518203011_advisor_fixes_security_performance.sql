-- 1. Security: Switch reorder_shots to SECURITY INVOKER
-- This ensures the function respects RLS policies and fixes the "Public Can Execute SECURITY DEFINER Function" warning.
create or replace function public.reorder_shots(
  p_shot_ids uuid[],
  p_shot_numbers text[],
  p_scene_numbers text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.shots as s
  set 
    shot_no = t.shot_no,
    scene_no = t.scene_no
  from (
    select 
      unnest(p_shot_ids) as id,
      unnest(p_shot_numbers) as shot_no,
      unnest(p_scene_numbers) as scene_no
  ) as t
  where s.id = t.id;
end;
$$;

-- 2. Performance: Re-add index for foreign key projects_user_id_fkey
-- This resolves the "Unindexed foreign keys" warning and optimizes RLS lookups.
create index if not exists idx_projects_user_id on public.projects(user_id);
;
