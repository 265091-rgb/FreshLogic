import { supabase } from '../config/supabase';
import { ExpiringItem, InventoryItem } from '../types';

export async function getExpiringItems(userId: string, days = 7): Promise<ExpiringItem[]> {
  const { data, error } = await supabase.rpc('get_expiring_items', {
    p_user_id: userId,
    p_days: days,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getInventory(userId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'expired')
    .order('expiration_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateItemQuantity(itemId: string, quantity: number) {
  const { error } = await supabase
    .from('inventory')
    .update({ quantity, last_modified: new Date().toISOString() })
    .eq('id', itemId);
  if (error) throw error;
}

export async function deleteItem(itemId: string) {
  const { error } = await supabase.from('inventory').delete().eq('id', itemId);
  if (error) throw error;
}

export async function addItem(item: Omit<InventoryItem, 'id' | 'status' | 'added_date' | 'last_modified'>) {
  const { data, error } = await supabase.from('inventory').insert(item).select().single();
  if (error) throw error;
  return data;
}
