export interface User {
  id: string;
  name: string;
  email: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  dietary_preferences?: string[];
  weight_goal?: 'lose' | 'gain' | 'maintain';
  alert_time?: string;
  baseline_waste_percent: number;
  baseline_budget?: number;
}

export type ItemStatus = 'fresh' | 'expiring_soon' | 'expired';

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  barcode?: string;
  category: string;
  quantity: number;
  unit: string;
  expiration_date?: string;
  status: ItemStatus;
  added_date: string;
  last_modified: string;
}

export interface ExpiringItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiration_date: string;
  days_until_expiry: number;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  cook_time?: number;
  servings?: number;
  ingredients?: Array<{ name: string; quantity: number; unit: string; in_inventory: boolean }>;
  instructions?: string[];
  nutrition?: { calories: number; protein: number; carbs: number; fat: number };
  favorite: boolean;
  created_at: string;
}

export interface ShoppingListItem {
  id: string;
  user_id: string;
  name: string;
  quantity?: number;
  unit?: string;
  checked: boolean;
  added_from?: 'manual' | 'recipe' | 'ai';
  recipe_id?: string;
  created_at: string;
}

export interface WeeklyStats {
  items_added: number;
  items_used: number;
  items_wasted: number;
  waste_percent: number;
  money_saved: number;
}
