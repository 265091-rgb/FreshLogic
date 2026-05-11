import { supabase } from '../config/supabase';
import { ExpiringItem, InventoryItem } from '../types';
import { getCached, setCached, invalidatePrefix } from './cache.service';

export async function getExpiringItems(userId: string, days = 7): Promise<ExpiringItem[]> {
  const cacheKey = `inventory:expiring:${userId}:${days}`;
  const cached = getCached<ExpiringItem[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.rpc('get_expiring_items', {
    p_user_id: userId,
    p_days: days,
  });
  if (error) throw error;
  const result = data ?? [];
  setCached(cacheKey, result);
  return result;
}

export async function getInventory(userId: string): Promise<InventoryItem[]> {
  const cacheKey = `inventory:list:${userId}`;
  const cached = getCached<InventoryItem[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'expired')
    .order('expiration_date', { ascending: true });
  if (error) throw error;
  const result = data ?? [];
  setCached(cacheKey, result);
  return result;
}

export async function updateItemQuantity(itemId: string, quantity: number) {
  const { error } = await supabase
    .from('inventory')
    .update({ quantity, last_modified: new Date().toISOString() })
    .eq('id', itemId);
  if (error) throw error;
  invalidatePrefix('inventory:');
}

export async function deleteItem(itemId: string) {
  const { error } = await supabase.from('inventory').delete().eq('id', itemId);
  if (error) throw error;
  invalidatePrefix('inventory:');
}

export async function addItem(item: Omit<InventoryItem, 'id' | 'status' | 'added_date' | 'last_modified'>) {
  const { data, error } = await supabase.from('inventory').insert(item).select().single();
  if (error) throw error;
  invalidatePrefix('inventory:');
  return data;
}
