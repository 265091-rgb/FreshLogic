import { supabase } from '../config/supabase';
import { ShoppingListItem } from '../types';

export async function getList(userId: string): Promise<ShoppingListItem[]> {
  const { data, error } = await supabase
    .from('shopping_list')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addItem(userId: string, name: string): Promise<ShoppingListItem> {
  const { data, error } = await supabase
    .from('shopping_list')
    .insert({ user_id: userId, name: name.trim(), added_from: 'manual' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleChecked(id: string, checked: boolean): Promise<void> {
  const { error } = await supabase
    .from('shopping_list')
    .update({ checked })
    .eq('id', id);
  if (error) throw error;
}

export async function removeItem(id: string): Promise<void> {
  const { error } = await supabase.from('shopping_list').delete().eq('id', id);
  if (error) throw error;
}

export async function clearChecked(userId: string): Promise<void> {
  const { error } = await supabase
    .from('shopping_list')
    .delete()
    .eq('user_id', userId)
    .eq('checked', true);
  if (error) throw error;
}

export async function getCommonItems(userId: string): Promise<string[]> {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const { data, error } = await supabase
    .from('inventory')
    .select('name')
    .eq('user_id', userId)
    .gte('added_date', since.toISOString());
  if (error || !data) return [];

  const counts: Record<string, number> = {};
  data.forEach(({ name }) => {
    const key = name.toLowerCase().trim();
    counts[key] = (counts[key] ?? 0) + 1;
  });

  return Object.entries(counts)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1));
}
