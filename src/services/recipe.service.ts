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
  const available = items.filter((i) => i.quantity > 0).slice(0, 15);
  const list = available.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ');

  const prompt =
    `You are an expert home cook writing a recipe for a cookbook. ` +
    `I have these ingredients: ${list}. ` +
    `Create ONE complete, realistic recipe using primarily these ingredients. ` +
    `\n\nINGREDIENT RULES: ` +
    `Include every ingredient with a specific real-world quantity and unit. ` +
    `Always include pantry staples needed (olive oil, butter, salt, black pepper, garlic, onion, spices). ` +
    `Use units like "tbsp", "tsp", "cups", "oz", "cloves", "pinch". ` +
    `\n\nINSTRUCTION RULES — THIS IS CRITICAL: ` +
    `Write EXACTLY 6 to 10 steps depending on recipe complexity. ` +
    `EACH step must be 1 to 3 full sentences long. ` +
    `EACH step must include: the specific action, exact quantities, exact heat level or temperature, ` +
    `exact time in minutes, and a visual or sensory cue for when it is done. ` +
    `NEVER write a vague step. ` +
    `BAD example (never do this): "Cook the chicken until done." ` +
    `GOOD example (always do this): "Season the chicken breasts on both sides with 1 teaspoon of salt and 1/2 teaspoon of black pepper. Heat 2 tablespoons of olive oil in a large skillet over medium-high heat until the oil shimmers. Add the chicken and cook undisturbed for 6 to 7 minutes per side until golden brown and the internal temperature reaches 165°F." ` +
    `\n\nRespond ONLY with valid JSON — no extra text, no markdown, no explanation: ` +
    `{"name":"string","meal_type":"breakfast|lunch|dinner|snack","cook_time":30,"servings":4,` +
    `"ingredients":[{"name":"string","quantity":1.0,"unit":"string","in_inventory":true}],` +
    `"instructions":["Full detailed step 1 with time, temp, and cue.","Full detailed step 2."]}`;

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama3.2:3b', prompt, stream: false, format: 'json' }),
  });

  if (!res.ok) throw new Error(`Ollama returned ${res.status}. Is it running?`);
  const data = await res.json();
  let parsed: GeneratedRecipe;
  try {
    parsed = JSON.parse(data.response) as GeneratedRecipe;
  } catch {
    throw new Error('Model returned an invalid response. Try again.');
  }
  if (!parsed.name) throw new Error('Model returned an empty recipe. Try again.');

  // Cross-reference generated ingredients against actual inventory so the
  // in_inventory flag reflects reality, not the model's guess.
  if (parsed.ingredients) {
    const inventoryNames = available.map((i) => i.name.toLowerCase());
    parsed.ingredients = parsed.ingredients.map((ing) => ({
      ...ing,
      in_inventory: inventoryNames.some(
        (n) => n.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(n),
      ),
    }));
  }

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
