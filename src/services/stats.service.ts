import { supabase } from '../config/supabase';
import { WeeklyStats } from '../types';

export async function getWeeklyStats(userId: string): Promise<WeeklyStats> {
  const { data, error } = await supabase.rpc('calculate_weekly_stats', {
    p_user_id: userId,
  });
  if (error) throw error;
  const row = data?.[0];
  return {
    items_added: row?.items_added ?? 0,
    items_used: row?.items_used ?? 0,
    items_wasted: row?.items_wasted ?? 0,
    waste_percent: row?.waste_percent ?? 0,
    money_saved: row?.money_saved ?? 0,
  };
}
