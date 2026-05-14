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
  storyboard_url?: string;
  created_at?: string;
}

export type Project = {
  id: string;
  user_id: string;
  title: string;
  director: string;
  dp: string;
  company_logo_url?: string;
  created_at?: string;
  shots?: Shot[];
}
