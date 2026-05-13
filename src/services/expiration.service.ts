import { supabase } from '../config/supabase';

const FALLBACK: Record<string, number> = {
  produce: 4,
  dairy: 7,
  protein: 5,
  grains: 180,
  beverages: 365,
  other: 30,
};

let _cache: Record<string, number> | null = null;

async function loadCache(): Promise<Record<string, number>> {
  if (_cache) return _cache;
  try {
    const { data, error } = await supabase
      .from('expiration_defaults')
      .select('category, days_fresh');
    if (!error && data && data.length > 0) {
      _cache = {};
      for (const row of data) _cache[row.category] = row.days_fresh;
      return _cache;
    }
  } catch { /* offline — fall through to FALLBACK */ }
  return FALLBACK;
}

export async function getDaysFresh(category: string): Promise<number> {
  const table = await loadCache();
  return table[category] ?? FALLBACK.other;
}

export async function getExpiryDate(category: string): Promise<string> {
  const days = await getDaysFresh(category);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/milk|cheese|yogurt|cream|butter|dairy/.test(n)) return 'dairy';
  if (/chicken|beef|pork|fish|salmon|tuna|turkey|lamb|shrimp|egg/.test(n)) return 'protein';
  if (/apple|banana|orange|berry|grape|lemon|lime|mango|peach|pear|carrot|broccoli|spinach|lettuce|tomato|onion|garlic|potato|pepper|cucumber|vegeta/.test(n)) return 'produce';
  if (/bread|pasta|rice|flour|cereal|grain|oat|tortilla|cracker|noodle/.test(n)) return 'grains';
  if (/juice|soda|water|tea|coffee|drink|beverage|wine|beer|lemonade/.test(n)) return 'beverages';
  return 'other';
}
