-- 1. Optimize reorder_shots function
-- Switched from a loop to a single UPDATE statement for better performance
-- Added SET search_path for security best practices
create or replace function public.reorder_shots(
  p_shot_ids uuid[],
  p_shot_numbers text[],
  p_scene_numbers text[]
)
returns void
language plpgsql
security definer
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

-- 2. Remove Unused Indexes
-- As identified by Supabase Performance Advisor
drop index if exists idx_projects_user_id;
drop index if exists idx_shots_scene_no;

-- 3. Cleanup: Ensure schema.sql is accurately reflected in the database
-- The schema.sql mentions removing these indexes, so we align the DB with that intent.
;
