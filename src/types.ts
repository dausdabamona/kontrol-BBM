export type Role = 'supir' | 'operator' | 'pengelola' | 'admin';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: Role;
}

export interface Asset {
  id: number;
  name: string;
  type: 'vehicle' | 'equipment';
}

export interface BBMUsage {
  id?: number;
  date: string;
  user_id: number;
  user_name: string;
  role: Role;
  asset_id: number;
  asset_name: string;
  amount_liters: number;
  notes?: string;
  photo?: string;
  timestamp?: string;
}

export interface BBMPurchase {
  id?: number;
  date: string;
  user_id: number;
  user_name: string;
  role: Role;
  amount_liters: number;
  cost: number;
  payment_type: 'cash' | 'kupon';
  notes?: string;
  photo?: string;
  timestamp?: string;
}
