import { supabase } from '../config/supabase';
import { Recipe, InventoryItem } from '../types';

// On web localhost works. On native, set EXPO_PUBLIC_OLLAMA_URL=http://<your-computer-ip>:11434
const OLLAMA_BASE = (process.env.EXPO_PUBLIC_OLLAMA_URL ?? 'http://localhost:11434').replace(/\/$/, '');

export interface GeneratedRecipe {
  name: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  cook_time?: number;
  servings?: number;
  ingredients?: Array<{ name: string; quantity: number; unit: string; in_inventory: boolean }>;
  instructions?: string[];
}

export async function generateRecipe(items: InventoryItem[]): Promise<GeneratedRecipe> {
  const list = items
    .filter((i) => i.quantity > 0)
    .slice(0, 15)
    .map((i) => `${i.name} (${i.quantity} ${i.unit})`)
    .join(', ');

  const prompt =
    `You are a helpful cooking assistant. I have these ingredients: ${list}. ` +
    `Suggest ONE recipe I can make. ` +
    `Respond ONLY with valid JSON matching this exact schema — no extra text: ` +
    `{"name":"string","meal_type":"breakfast|lunch|dinner|snack","cook_time":30,"servings":4,` +
    `"ingredients":[{"name":"string","quantity":1,"unit":"string","in_inventory":true}],` +
    `"instructions":["string"]}`;

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama3.2:3b', prompt, stream: false, format: 'json' }),
  });

  if (!res.ok) throw new Error(`Ollama returned ${res.status}. Is it running?`);
  const data = await res.json();
  const parsed = JSON.parse(data.response) as GeneratedRecipe;
  if (!parsed.name) throw new Error('Model returned an empty recipe. Try again.');
  return parsed;
}

export async function saveRecipe(userId: string, recipe: GeneratedRecipe): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      user_id: userId,
      name: recipe.name,
      meal_type: recipe.meal_type,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      ingredients: recipe.ingredients ?? [],
      instructions: recipe.instructions ?? [],
      favorite: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function toggleFavorite(id: string, favorite: boolean): Promise<void> {
  const { error } = await supabase.from('recipes').update({ favorite }).eq('id', id);
  if (error) throw error;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}
