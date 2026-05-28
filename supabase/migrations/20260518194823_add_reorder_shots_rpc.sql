create or replace function public.reorder_shots(
  p_shot_ids uuid[],
  p_shot_numbers text[],
  p_scene_numbers text[]
)
returns void
language plpgsql
security definer
as $$
begin
  for i in 1 .. array_length(p_shot_ids, 1) loop
    update public.shots
    set 
      shot_no = p_shot_numbers[i],
      scene_no = p_scene_numbers[i]
    where id = p_shot_ids[i];
  end loop;
end;
$$;;
