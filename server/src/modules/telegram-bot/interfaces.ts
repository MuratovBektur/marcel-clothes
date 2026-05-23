export interface IUser {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  phone: string | null;
  role_id: number;
  created_by_id: string | null;
}

export interface IBrand {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  country: string | null;
  is_active: boolean;
  created_by_id: string | null;
  owner_id: string | null;
  created_at: Date;
}
