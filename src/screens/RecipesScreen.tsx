import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import {
  getInventory, updateItemQuantity, deleteItem, addItem,
} from '../services/inventory.service';
import {
  generateRecipe, saveRecipe, getRecipes, toggleFavorite, deleteRecipe,
  GeneratedRecipe,
} from '../services/recipe.service';
import { getRecipeMatches, RecipeMatch } from '../services/recipe-matcher.service';
import { addItem as addShoppingItem } from '../services/shoppingList.service';
import { InventoryItem, Recipe } from '../types';

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
};

const LOADING_MSGS = [
  'Looking at your ingredients…',
  'Thinking up something delicious…',
  'Checking recipe ideas…',
  'Almost ready…',
];

function RecipeCard({
  recipe,
  onPress,
  onToggleFav,
  onMakeIt,
  onSkipIt,
  isMaking,
}: {
  recipe: Recipe;
  onPress: () => void;
  onToggleFav: () => void;
  onMakeIt: () => void;
  onSkipIt: () => void;
  isMaking: boolean;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardTop} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardEmoji}>{MEAL_EMOJI[recipe.meal_type ?? ''] ?? '👨‍🍳'}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{recipe.name}</Text>
            <Text style={styles.cardMeta}>
              {recipe.cook_time ? `🕒 ${recipe.cook_time} min` : ''}
              {recipe.cook_time && recipe.servings ? '  ·  ' : ''}
              {recipe.servings ? `🍽 ${recipe.servings} servings` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onToggleFav} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.star}>{recipe.favorite ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
      <View style={styles.cardButtons}>
        <TouchableOpacity
          style={[styles.makeItBtn, isMaking && styles.makeItBtnDisabled]}
          onPress={onMakeIt}
          disabled={isMaking}
          activeOpacity={0.85}
        >
          {isMaking
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.makeItBtnText}>🍳 Make It</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipItBtn} onPress={onSkipIt} activeOpacity={0.75}>
          <Text style={styles.skipItBtnText}>Skip It</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type Filter = 'all' | 'favorites' | 'matches';

export default function RecipesScreen() {
  const { supabaseUser } = useAuth();
  const navigation = useNavigation<any>();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [draft, setDraft] = useState<GeneratedRecipe | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [matches, setMatches] = useState<RecipeMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [leftoverMode, setLeftoverMode] = useState(false);
  const [leftoverServings, setLeftoverServings] = useState(0);
  const [making, setMaking] = useState(false);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [makingRecipeId, setMakingRecipeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseUser) return;
    try {
      setRecipes(await getRecipes(supabaseUser.id));
    } catch { /* keep stale */ }
  }, [supabaseUser]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  useEffect(() => {
    if (filter !== 'matches' || !supabaseUser) return;
    setMatchesLoading(true);
    getRecipeMatches(supabaseUser.id)
      .then(setMatches)
      .finally(() => setMatchesLoading(false));
  }, [filter, supabaseUser]);

  async function deductIngredients(
    recipeIngredients: NonNullable<GeneratedRecipe['ingredients']>,
    inventory: InventoryItem[],
  ) {
    const entries = inventory.map((i) => ({ item: i, key: i.name.toLowerCase() }));
    const used = new Set<string>();

    for (const ing of recipeIngredients) {
      if (!ing.in_inventory) continue;
      const needle = ing.name.toLowerCase();
      const match = entries.find(
        ({ key, item }) => !used.has(item.id) && (key.includes(needle) || needle.includes(key)),
      );
      if (!match) continue;
      used.add(match.item.id);
      const newQty = match.item.unit.toLowerCase() === ing.unit.toLowerCase()
        ? Math.max(0, match.item.quantity - ing.quantity)
        : 0;
      if (newQty <= 0) {
        await deleteItem(match.item.id);
      } else {
        await updateItemQuantity(match.item.id, Math.round(newQty * 1000) / 1000);
      }
    }
  }

  function handleMakeItPress() {
    setLeftoverServings(0);
    setLeftoverMode(true);
  }

  async function handleConfirmMake() {
    if (!supabaseUser || !draft) return;
    setMaking(true);
    try {
      const [saved, inventory] = await Promise.all([
        saveRecipe(supabaseUser.id, draft),
        getInventory(supabaseUser.id),
      ]);
      setRecipes((prev) => [saved, ...prev]);

      if (draft.ingredients) await deductIngredients(draft.ingredients, inventory);

      if (leftoverServings > 0) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 4);
        await addItem({
          user_id: supabaseUser.id,
          name: `${draft.name} (leftover)`,
          category: 'other',
          quantity: leftoverServings,
          unit: 'servings',
          expiration_date: expiry.toISOString().split('T')[0],
        });
      }

      setDraft(null);
      setLeftoverMode(false);
      Alert.alert(
        'Enjoy your meal!',
        leftoverServings > 0
          ? `${leftoverServings} serving${leftoverServings !== 1 ? 's' : ''} saved to your fridge.`
          : 'Ingredients removed from your fridge.',
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setMaking(false);
    }
  }

  async function handleMakeIt(recipe: Recipe) {
    if (!supabaseUser) return;
    setMakingRecipeId(recipe.id);
    try {
      const ingredients = recipe.ingredients ?? [];
      if (ingredients.length === 0) {
        Alert.alert("You have everything you need — let's cook! 🍳");
        return;
      }
      const inventory = await getInventory(supabaseUser.id);
      const inventoryNames = inventory
        .filter((i) => i.quantity > 0)
        .map((i) => i.name.toLowerCase());
      const missing = ingredients.filter((ing) => {
        const needle = ing.name.toLowerCase();
        return !inventoryNames.some((n) => n.includes(needle) || needle.includes(n));
      });
      if (missing.length === 0) {
        Alert.alert("You have everything you need — let's cook! 🍳");
        return;
      }
      await Promise.all(missing.map((ing) => addShoppingItem(supabaseUser.id, ing.name)));
      navigation.navigate('List');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not add to shopping list.');
    } finally {
      setMakingRecipeId(null);
    }
  }

  function handleSkipIt(recipeId: string) {
    setSkippedIds((prev) => new Set([...prev, recipeId]));
  }

  async function handleGenerate() {
    if (!supabaseUser) return;
    setGenerating(true);
    setDraft(null);
    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[msgIdx]);
    }, 3000);

    try {
      const inventory = await getInventory(supabaseUser.id);
      if (!inventory.filter((i) => i.quantity > 0).length) {
        Alert.alert('Fridge is empty', 'Add some items to your fridge first so the AI has ingredients to work with.');
        return;
      }
      const recipe = await generateRecipe(inventory);
      setDraft(recipe);
    } catch (e: any) {
      Alert.alert(
        'Could not generate recipe',
        e.message?.includes('Ollama') || e.message?.includes('fetch')
          ? 'Make sure Ollama is running on your computer (run: ollama serve) and the model is installed (run: ollama pull llama3.2:3b).'
          : (e.message ?? 'Something went wrong. Try again.'),
      );
    } finally {
      clearInterval(interval);
      setGenerating(false);
    }
  }

  async function handleToggleFav(recipe: Recipe) {
    const next = !recipe.favorite;
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, favorite: next } : r)));
    try {
      await toggleFavorite(recipe.id, next);
    } catch {
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, favorite: recipe.favorite } : r)));
    }
  }

  async function handleDelete(recipe: Recipe) {
    Alert.alert('Delete recipe?', `Remove "${recipe.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
          try { await deleteRecipe(recipe.id); } catch { load(); }
        },
      },
    ]);
  }

  const favCount = recipes.filter((r) => r.favorite).length;
  const displayed = (filter === 'favorites' ? recipes.filter((r) => r.favorite) : recipes)
    .filter((r) => !skippedIds.has(r.id));
  const displayedMatches = matches.filter((m) => !skippedIds.has(m.recipe.id));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#8B9D83" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>👨‍🍳 Recipes</Text>
      </View>

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
        onPress={handleGenerate}
        disabled={generating}
        activeOpacity={0.85}
      >
        {generating ? (
          <View style={styles.generatingRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.generateBtnText}>{loadingMsg}</Text>
          </View>
        ) : (
          <Text style={styles.generateBtnText}>✨ Suggest a Recipe from Your Fridge</Text>
        )}
      </TouchableOpacity>

      {/* Draft recipe preview */}
      {draft && (
        <View style={styles.draftCard}>
          <View style={styles.draftHeader}>
            <Text style={styles.draftTag}>NEW RECIPE</Text>
            <Text style={styles.draftName} numberOfLines={2}>{draft.name}</Text>
            <Text style={styles.draftMeta}>
              {MEAL_EMOJI[draft.meal_type ?? ''] ?? '👨‍🍳'} {draft.meal_type ?? 'recipe'}
              {draft.cook_time ? `  ·  🕒 ${draft.cook_time} min` : ''}
              {draft.servings ? `  ·  🍽 ${draft.servings} servings` : ''}
            </Text>
          </View>
          {draft.ingredients && draft.ingredients.length > 0 && (
            <Text style={styles.draftIngredients} numberOfLines={2}>
              {draft.ingredients.slice(0, 4).map((i) => i.name).join(', ')}
              {draft.ingredients.length > 4 ? ` +${draft.ingredients.length - 4} more` : ''}
            </Text>
          )}
          {leftoverMode && (
            <View style={styles.leftoverBox}>
              <Text style={styles.leftoverTitle}>Leftovers going back in the fridge?</Text>
              <Text style={styles.leftoverValue}>
                {leftoverServings === 0
                  ? 'None — eating everything now'
                  : `${leftoverServings} serving${leftoverServings !== 1 ? 's' : ''}`}
              </Text>
              <Slider
                style={styles.leftoverSlider}
                minimumValue={0}
                maximumValue={draft.servings ?? 4}
                step={1}
                value={leftoverServings}
                onValueChange={setLeftoverServings}
                minimumTrackTintColor="#6B7F5F"
                maximumTrackTintColor="#E8EDE6"
                thumbTintColor="#6B7F5F"
              />
              <View style={styles.leftoverEdges}>
                <Text style={styles.edgeLabel}>None</Text>
                <Text style={styles.edgeLabel}>{draft.servings ?? 4} servings</Text>
              </View>
            </View>
          )}
          <View style={styles.draftActions}>
            {!leftoverMode ? (
              <>
                <TouchableOpacity style={styles.discardBtn} onPress={() => setDraft(null)} activeOpacity={0.8}>
                  <Text style={styles.discardBtnText}>Don't make it</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleMakeItPress} activeOpacity={0.85}>
                  <Text style={styles.saveBtnText}>🍳 Make it</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.discardBtn} onPress={() => setLeftoverMode(false)} activeOpacity={0.8}>
                  <Text style={styles.discardBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, making && styles.saveBtnDisabled]}
                  onPress={handleConfirmMake}
                  disabled={making}
                  activeOpacity={0.85}
                >
                  {making
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>Confirm & Cook</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* Filter tab bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.75}
        >
          <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>
            All {recipes.length > 0 ? `(${recipes.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterPill, filter === 'favorites' && styles.filterPillActive]}
          onPress={() => setFilter('favorites')}
          activeOpacity={0.75}
        >
          <Text style={[styles.filterPillText, filter === 'favorites' && styles.filterPillTextActive]}>
            ⭐ {favCount > 0 ? `(${favCount})` : 'Favs'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterPill, filter === 'matches' && styles.filterPillActive]}
          onPress={() => setFilter('matches')}
          activeOpacity={0.75}
        >
          <Text style={[styles.filterPillText, filter === 'matches' && styles.filterPillTextActive]}>
            🥗 Fridge
          </Text>
        </TouchableOpacity>
      </View>

      {/* Fridge matches view */}
      {filter === 'matches' && (
        matchesLoading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#8B9D83" /></View>
        ) : (
          <FlatList
            data={displayedMatches}
            keyExtractor={(m) => m.recipe.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              displayedMatches.length > 0 ? (
                <Text style={styles.sectionLabel}>MATCHES YOUR FRIDGE ({displayedMatches.length})</Text>
              ) : null
            }
            renderItem={({ item: m }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('RecipeDetail', { recipe: m.recipe })}
                activeOpacity={0.85}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.cardEmoji}>{MEAL_EMOJI[m.recipe.meal_type ?? ''] ?? '👨‍🍳'}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>{m.recipe.name}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {m.matchedIngredients.slice(0, 3).join(', ')}
                      {m.matchedIngredients.length > 3 ? ` +${m.matchedIngredients.length - 3} more` : ''}
                    </Text>
                  </View>
                </View>
                <View style={[styles.matchBadge, m.matchPercent >= 0.8 && styles.matchBadgeHigh]}>
                  <Text style={styles.matchBadgeText}>
                    {m.matchCount}/{m.totalIngredients}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🥗</Text>
                <Text style={styles.emptyTitle}>No matches yet</Text>
                <Text style={styles.emptySub}>
                  Save some AI-generated recipes first, then add items to your fridge — matches will appear here.
                </Text>
              </View>
            }
          />
        )
      )}

      {/* Saved recipes list */}
      {filter !== 'matches' && (
        <FlatList
          data={displayed}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            displayed.length > 0 ? (
              <Text style={styles.sectionLabel}>
                {filter === 'favorites' ? `FAVORITES (${favCount})` : `SAVED RECIPES (${recipes.length})`}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}
              onToggleFav={() => handleToggleFav(item)}
            />
          )}
          ListEmptyComponent={
            !draft ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>{filter === 'favorites' ? '⭐' : '🍳'}</Text>
                <Text style={styles.emptyTitle}>
                  {filter === 'favorites' ? 'No favorites yet' : 'No saved recipes yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {filter === 'favorites'
                    ? 'Tap the ☆ on any recipe card to star it.'
                    : 'Tap the button above and the AI will suggest something based on what\'s in your fridge.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAF7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#2D3319' },
  generateBtn: {
    marginHorizontal: 20, marginBottom: 16, backgroundColor: '#6B7F5F',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  generateBtnDisabled: { backgroundColor: '#8B9D83' },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  draftCard: {
    marginHorizontal: 20, marginBottom: 16, backgroundColor: '#fff',
    borderRadius: 14, borderWidth: 2, borderColor: '#6B7F5F', padding: 16,
  },
  draftHeader: { marginBottom: 8 },
  draftTag: {
    fontSize: 10, fontWeight: '700', color: '#6B7F5F', letterSpacing: 1,
    backgroundColor: '#E8F0E6', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6,
  },
  draftName: { fontSize: 18, fontWeight: '700', color: '#2D3319', marginBottom: 4 },
  draftMeta: { fontSize: 13, color: '#6B7566' },
  draftIngredients: { fontSize: 13, color: '#A8B89F', marginBottom: 12 },
  draftActions: { flexDirection: 'row', gap: 10 },
  discardBtn: {
    flex: 1, borderWidth: 1, borderColor: '#D4DDD0', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  discardBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7566' },
  saveBtn: {
    flex: 2, backgroundColor: '#6B7F5F', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#8B9D83' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  filterBar: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  filterPill: {
    flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center',
    backgroundColor: '#F2F5F0', borderWidth: 1, borderColor: '#E8EDE6',
  },
  filterPillActive: {
    backgroundColor: '#6B7F5F', borderColor: '#6B7F5F',
  },
  filterPillText: { fontSize: 13, fontWeight: '600', color: '#6B7566' },
  filterPillTextActive: { color: '#fff' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B7566', letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E8EDE6',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardEmoji: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#2D3319', marginBottom: 3 },
  cardMeta: { fontSize: 12, color: '#6B7566' },
  star: { fontSize: 22 },
  leftoverBox: {
    backgroundColor: '#F2F5F0', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  leftoverTitle: { fontSize: 13, fontWeight: '600', color: '#6B7566', marginBottom: 4 },
  leftoverValue: { fontSize: 15, fontWeight: '700', color: '#2D3319', textAlign: 'center', marginBottom: 2 },
  leftoverSlider: { width: '100%', height: 36 },
  leftoverEdges: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  edgeLabel: { fontSize: 10, color: '#A8B89F' },
  matchBadge: {
    backgroundColor: '#E8F0E6', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4, minWidth: 36, alignItems: 'center',
  },
  matchBadgeHigh: { backgroundColor: '#6B7F5F' },
  matchBadgeText: { fontSize: 11, fontWeight: '700', color: '#4A5D43' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4A5D43', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#6B7566', textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
});
