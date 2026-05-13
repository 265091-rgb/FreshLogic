import { supabase } from '../config/supabase';
import { getInventory } from './inventory.service';
import { Recipe } from '../types';

export interface RecipeMatch {
  recipe: Recipe;
  matchCount: number;
  totalIngredients: number;
  matchPercent: number;
  matchedIngredients: string[];
}

export async function getRecipeMatches(userId: string): Promise<RecipeMatch[]> {
  try {
    const [{ data: recipeData, error }, inventory] = await Promise.all([
      supabase
        .from('recipes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      getInventory(userId),
    ]);
    if (error) return [];

    const recipes = (recipeData ?? []) as Recipe[];
    const inventoryNames = inventory
      .filter((i) => i.quantity > 0)
      .map((i) => i.name.toLowerCase());

    return recipes
      .filter((r) => r.ingredients && r.ingredients.length > 0)
      .map((recipe) => {
        const ingredients = recipe.ingredients ?? [];
        const matchedIngredients = ingredients
          .filter((ing) => {
            const needle = ing.name.toLowerCase();
            return inventoryNames.some((n) => n.includes(needle) || needle.includes(n));
          })
          .map((ing) => ing.name);
        return {
          recipe,
          matchCount: matchedIngredients.length,
          totalIngredients: ingredients.length,
          matchPercent: ingredients.length > 0 ? matchedIngredients.length / ingredients.length : 0,
          matchedIngredients,
        };
      })
      .filter((m) => m.matchCount > 0)
      .sort((a, b) => b.matchPercent - a.matchPercent);
  } catch {
    return [];
  }
}
