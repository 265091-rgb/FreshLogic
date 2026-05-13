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

// Known cooking units — used to detect the unit word in an ingredient line.
const KNOWN_UNITS = new Set([
  'tablespoon', 'tablespoons', 'tbsp', 'tbsps',
  'teaspoon', 'teaspoons', 'tsp', 'tsps',
  'cup', 'cups',
  'ounce', 'ounces', 'oz',
  'pound', 'pounds', 'lb', 'lbs',
  'gram', 'grams', 'g',
  'kilogram', 'kilograms', 'kg',
  'milliliter', 'milliliters', 'ml',
  'liter', 'liters',
  'gallon', 'gallons',
  'clove', 'cloves',
  'can', 'cans',
  'pinch', 'pinches',
  'dash', 'dashes',
  'handful', 'handfuls',
  'bunch', 'bunches',
  'head', 'heads',
  'stalk', 'stalks',
  'slice', 'slices',
  'piece', 'pieces',
]);

function parseFraction(s: string): number {
  s = s.trim();
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  return parseFloat(s) || 1;
}

function parseIngredientLine(raw: string): { name: string; quantity: number; unit: string } | null {
  // Remove bullet and collapse all parenthetical notes like "(about 1/4 cup)", "(12 count)"
  let line = raw.replace(/^[-*•]\s*/, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (!line) return null;

  // Match a leading number: "1", "1.5", "1/2", "1 1/2"
  const numRe = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)\s+/;
  const numMatch = line.match(numRe);

  if (!numMatch) {
    // No leading number — e.g. "Salt and pepper to taste"
    const cleaned = line.replace(/\b(to taste|as needed|optional)\b.*/i, '').trim();
    return cleaned.length > 1 ? { name: cleaned, quantity: 1, unit: 'pinch' } : null;
  }

  const quantity = parseFraction(numMatch[1].trim());
  const rest = line.slice(numMatch[0].length).trim();

  // Check if the first word is a known unit
  const firstWord = rest.split(/\s+/)[0].toLowerCase().replace(/[.,;:]+$/, '');
  if (KNOWN_UNITS.has(firstWord)) {
    const name = rest.slice(firstWord.length).trim();
    return name ? { name, quantity, unit: firstWord } : null;
  }

  // No unit — the entire rest is the ingredient name, unit is "count"
  return rest ? { name: rest, quantity, unit: 'count' } : null;
}

// Step 1: generate plain-text recipe. Small models handle prose far better
// than deeply nested JSON, so we ask for a structured text format and parse
// it into JSON ourselves in step 2.
async function generatePlainTextRecipe(list: string): Promise<string> {
  const prompt =
    `You are an expert home cook. I have these ingredients: ${list}.\n` +
    `Write ONE complete recipe using primarily these ingredients.\n` +
    `Always include pantry staples like salt, pepper, olive oil, butter, and spices.\n\n` +
    `Use EXACTLY this format — no extra sections, no tips, nothing else:\n\n` +
    `NAME: [recipe name]\n` +
    `MEAL: [breakfast, lunch, dinner, or snack]\n` +
    `TIME: [total minutes as a number only]\n` +
    `SERVINGS: [number only]\n\n` +
    `INGREDIENTS:\n` +
    `- [quantity] [unit] [ingredient name]\n` +
    `- [quantity] [unit] [ingredient name]\n\n` +
    `INSTRUCTIONS:\n` +
    `1. [2 to 3 full sentences: state the exact action, exact quantity, exact heat or temperature, exact minutes, and what it looks/smells like when done.]\n` +
    `2. [Same detail level.]\n` +
    `Write 6 to 10 numbered steps. Stop after the last step.\n\n` +
    `Good step example: "Heat 2 tablespoons of olive oil in a large skillet over medium-high heat until shimmering, about 1 minute. Add the diced onion and cook, stirring occasionally, for 4 to 5 minutes until the edges are golden and the onion is soft and translucent."\n` +
    `Bad step example (never write this): "Cook the onion until soft."\n\n` +
    `Output the recipe now:`;

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama3.2:3b', prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama returned ${res.status}. Is it running?`);
  const data = await res.json();
  return data.response as string;
}

// Step 2: parse the plain-text recipe into GeneratedRecipe.
function parsePlainTextRecipe(text: string): GeneratedRecipe {
  const field = (label: string) => {
    const m = text.match(new RegExp(`^${label}:\\s*(.+)$`, 'im'));
    return m ? m[1].trim() : '';
  };

  const name = field('NAME');
  if (!name) throw new Error('Model returned an empty recipe. Try again.');

  const mealRaw = field('MEAL').toLowerCase();
  const meal_type = (['breakfast', 'lunch', 'dinner', 'snack'] as const).find((m) => mealRaw.includes(m));

  // parseInt handles "45 minutes" and "45" equally
  const cook_time = parseInt(field('TIME'), 10) || undefined;
  const servings = parseInt(field('SERVINGS'), 10) || undefined;

  // Ingredients: everything between INGREDIENTS: and INSTRUCTIONS:
  const ingSection = text.match(/^INGREDIENTS:\s*\n([\s\S]*?)(?=^INSTRUCTIONS:)/im)?.[1] ?? '';
  const ingredients: GeneratedRecipe['ingredients'] = ingSection
    .split('\n')
    .map(parseIngredientLine)
    .filter((i): i is NonNullable<typeof i> => i !== null)
    .map((i) => ({ ...i, in_inventory: false }));

  // Instructions: all numbered lines after INSTRUCTIONS:
  const instStart = text.search(/^INSTRUCTIONS:/im);
  const instSection = instStart >= 0 ? text.slice(instStart) : '';
  const instructions: string[] = instSection
    .split('\n')
    .map((row) => row.match(/^\d+[.)]\s+(.+)$/)?.[1]?.trim() ?? '')
    .filter((s) => s.length > 15);

  if (instructions.length === 0) throw new Error('Model returned no instructions. Try again.');
  return { name, meal_type, cook_time, servings, ingredients, instructions };
}

export async function generateRecipe(items: InventoryItem[]): Promise<GeneratedRecipe> {
  const available = items.filter((i) => i.quantity > 0).slice(0, 15);
  const list = available.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ');

  const text = await generatePlainTextRecipe(list);
  const parsed = parsePlainTextRecipe(text);

  // Cross-reference generated ingredients against actual inventory
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
