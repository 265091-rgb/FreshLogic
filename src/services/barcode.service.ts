const OFF_API = 'https://world.openfoodfacts.org/api/v0/product';

export interface BarcodeResult {
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
}

export async function lookupBarcode(barcode: string): Promise<BarcodeResult | null> {
  try {
    const res = await fetch(`${OFF_API}/${barcode}.json`);
    const data = await res.json();
    if (data.status !== 1) return null;
    const p = data.product;
    const categories = p.categories ?? p.pnns_groups_1 ?? '';
    return {
      name: p.product_name ?? p.product_name_en ?? '',
      brand: p.brands ?? '',
      category: mapCategory(categories),
      imageUrl: p.image_url ?? '',
    };
  } catch {
    return null;
  }
}

export function mapCategory(categories: string): string {
  const c = categories.toLowerCase();
  if (/dairy|milk|cheese|yogurt|cream|butter/.test(c)) return 'dairy';
  if (/meat|chicken|beef|pork|fish|seafood|protein|poultry/.test(c)) return 'protein';
  if (/vegetable|fruit|produce|fresh/.test(c)) return 'produce';
  if (/bread|cereal|grain|pasta|rice|flour|baked/.test(c)) return 'grains';
  if (/beverage|drink|juice|water|soda|tea|coffee/.test(c)) return 'beverages';
  return 'other';
}

export function defaultExpiryDate(category: string): string {
  const days: Record<string, number> = {
    produce: 4,
    dairy: 7,
    protein: 5,
    grains: 180,
    beverages: 365,
    other: 30,
  };
  const d = new Date();
  d.setDate(d.getDate() + (days[category] ?? 30));
  return d.toISOString().split('T')[0];
}
