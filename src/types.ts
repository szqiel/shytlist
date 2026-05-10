export type Shot = {
  id: string;
  project_id: string;
  shot_no: string;
  scene_no: string;
  shot_size: string;
  lens: string;
  movement: string;
  angle: string;
  framing: string;
  description: string;
  created_at?: string;
}

export type Project = {
  id: string;
  user_id: string;
  title: string;
  director: string;
  created_at?: string;
  shots?: Shot[];
}
