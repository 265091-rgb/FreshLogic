import { supabase } from '../config/supabase';
import { WeeklyStats } from '../types';
import { getCached, setCached } from './cache.service';

export interface WeekSummary {
  week_label: string;
  items_added: number;
  items_wasted: number;
  waste_percent: number;
}

export async function getWeeklyStats(userId: string): Promise<WeeklyStats> {
  const cacheKey = `stats:weekly:${userId}`;
  const cached = getCached<WeeklyStats>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.rpc('calculate_weekly_stats', {
    p_user_id: userId,
  });
  if (error) throw error;
  const row = data?.[0];
  const result: WeeklyStats = {
    items_added: row?.items_added ?? 0,
    items_used: row?.items_used ?? 0,
    items_wasted: row?.items_wasted ?? 0,
    waste_percent: row?.waste_percent ?? 0,
    money_saved: row?.money_saved ?? 0,
  };
  setCached(cacheKey, result);
  return result;
}

export async function getWeeklyHistory(userId: string): Promise<WeekSummary[]> {
  const cacheKey = `stats:history:${userId}`;
  const cached = getCached<WeekSummary[]>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const weeks: WeekSummary[] = [];

  for (let i = 0; i < 4; i++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const { data } = await supabase
      .from('inventory')
      .select('id, status')
      .eq('user_id', userId)
      .gte('added_date', startStr)
      .lte('added_date', endStr);

    const items = data ?? [];
    const added = items.length;
    const wasted = items.filter((it) => it.status === 'expired').length;

    weeks.push({
      week_label: i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i} weeks ago`,
      items_added: added,
      items_wasted: wasted,
      waste_percent: added > 0 ? Math.round((wasted / added) * 100) : 0,
    });
  }

  setCached(cacheKey, weeks);
  return weeks;
}
