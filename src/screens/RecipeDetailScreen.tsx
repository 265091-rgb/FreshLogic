import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { toggleFavorite, deleteRecipe } from '../services/recipe.service';
import { Recipe } from '../types';

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🍳', lunch: '🥗', dinner: '🍽️', snack: '🍎',
};

function formatMealType(t?: string) {
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function RecipeDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [recipe, setRecipe] = useState<Recipe>(route.params.recipe);

  async function handleToggleFav() {
    const next = !recipe.favorite;
    setRecipe((r) => ({ ...r, favorite: next }));
    try {
      await toggleFavorite(recipe.id, next);
    } catch {
      setRecipe((r) => ({ ...r, favorite: recipe.favorite }));
    }
  }

  async function handleShare() {
    const ingredients = (recipe.ingredients ?? [])
      .map((i) => `  - ${i.quantity} ${i.unit} ${i.name}`)
      .join('\n');
    const instructions = (recipe.instructions ?? [])
      .map((step, i) => `${i + 1}. ${step}`)
      .join('\n');

    await Share.share({
      message: `${recipe.name}\n\nIngredients:\n${ingredients}\n\nInstructions:\n${instructions}\n\nMade with FreshLogic 🥦`,
      title: recipe.name,
    });
  }

  async function handleDelete() {
    Alert.alert('Delete recipe?', `Remove "${recipe.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteRecipe(recipe.id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Could not delete.');
          }
        },
      },
    ]);
  }

  const ingredients = recipe.ingredients ?? [];
  const instructions = recipe.instructions ?? [];
  const inFridge = ingredients.filter((i) => i.in_inventory);
  const notInFridge = ingredients.filter((i) => !i.in_inventory);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn}>
          <Text style={styles.topBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.topRight}>
          <TouchableOpacity onPress={handleToggleFav} style={styles.topBtn}>
            <Text style={styles.starBtn}>{recipe.favorite ? '⭐' : '☆'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.topBtn}>
            <Text style={styles.topBtnText}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.topBtn}>
            <Text style={styles.deleteBtn}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <Text style={styles.title}>{recipe.name}</Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {recipe.meal_type && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                {MEAL_EMOJI[recipe.meal_type]} {formatMealType(recipe.meal_type)}
              </Text>
            </View>
          )}
          {recipe.cook_time && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>🕒 {recipe.cook_time} min</Text>
            </View>
          )}
          {recipe.servings && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>🍽 {recipe.servings} servings</Text>
            </View>
          )}
        </View>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>

            {inFridge.length > 0 && (
              <>
                <Text style={styles.ingredientGroup}>✅ In your fridge</Text>
                {inFridge.map((ing, i) => (
                  <View key={i} style={styles.ingredientRow}>
                    <View style={styles.ingredientDot} />
                    <Text style={styles.ingredientText}>
                      <Text style={styles.ingredientQty}>{ing.quantity} {ing.unit}</Text>
                      {'  '}{ing.name}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {notInFridge.length > 0 && (
              <>
                <Text style={[styles.ingredientGroup, { marginTop: inFridge.length > 0 ? 12 : 0 }]}>
                  🛒 You'll need to buy
                </Text>
                {notInFridge.map((ing, i) => (
                  <View key={i} style={styles.ingredientRow}>
                    <View style={[styles.ingredientDot, { backgroundColor: '#A8B89F' }]} />
                    <Text style={[styles.ingredientText, { color: '#6B7566' }]}>
                      <Text style={styles.ingredientQty}>{ing.quantity} {ing.unit}</Text>
                      {'  '}{ing.name}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Instructions */}
        {instructions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {instructions.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#F2F5F0',
  },
  topBtn: { padding: 6 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topBtnText: { fontSize: 15, color: '#6B7F5F', fontWeight: '600' },
  starBtn: { fontSize: 22 },
  deleteBtn: { fontSize: 18 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '700', color: '#2D3319', marginTop: 20, marginBottom: 14, lineHeight: 32 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  metaChip: {
    backgroundColor: '#F2F5F0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E8EDE6',
  },
  metaChipText: { fontSize: 13, color: '#4A5D43', fontWeight: '500' },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D3319', marginBottom: 14 },
  ingredientGroup: { fontSize: 12, fontWeight: '700', color: '#6B7566', letterSpacing: 0.4, marginBottom: 8, textTransform: 'uppercase' },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6B7F5F', marginTop: 6 },
  ingredientText: { flex: 1, fontSize: 15, color: '#2D3319', lineHeight: 22 },
  ingredientQty: { fontWeight: '700' },
  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#6B7F5F',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 15, color: '#2D3319', lineHeight: 24 },
});
