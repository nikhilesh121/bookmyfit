import { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ImageBackground, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { colors, fonts, radius } from '../../theme/brand';
import { IconCart, IconTag } from '../../components/Icons';
import { storeApi } from '../../lib/api';
import AuroraBackground from '../../components/AuroraBackground';
import { addToCart, cartCount as getCartCount } from '../cart';

const CATS = ['All', 'Supplements', 'Accessories', 'Apparel', 'Equipment'];

const DUMMY_IMAGES: Record<string, string> = {
  Supplements: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80',
  Accessories: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
  Apparel: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80',
  Equipment: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
  default: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400&q=80',
};

const FALLBACK_PRODUCTS = [
  { id: 'p1', name: 'Whey Pro 2kg', brand: 'MuscleBlaze', price: 2199, category: 'Supplements', img: DUMMY_IMAGES.Supplements, aurora: 'rgba(0,212,106,0.55)' },
  { id: 'p2', name: 'Pro Shaker Cup', brand: 'GNC Sports', price: 449, category: 'Accessories', img: DUMMY_IMAGES.default, aurora: 'rgba(0,175,255,0.55)' },
  { id: 'p3', name: 'Lifting Gloves', brand: 'Harbinger', price: 799, category: 'Accessories', img: DUMMY_IMAGES.Accessories, aurora: 'rgba(155,0,255,0.55)' },
  { id: 'p4', name: 'Resistance Band Set', brand: 'Boldfit', price: 599, category: 'Equipment', img: DUMMY_IMAGES.Equipment, aurora: 'rgba(255,138,0,0.55)' },
  { id: 'p5', name: 'BCAA 250g', brand: 'AS-IT-IS', price: 899, category: 'Supplements', img: DUMMY_IMAGES.Supplements, aurora: 'rgba(0,212,106,0.55)' },
  { id: 'p6', name: 'Training T-Shirt', brand: 'Nivia Sports', price: 649, category: 'Apparel', img: DUMMY_IMAGES.Apparel, aurora: 'rgba(0,175,255,0.55)' },
];

const AURORA_COLORS = ['rgba(0,212,106,0.55)', 'rgba(0,175,255,0.55)', 'rgba(155,0,255,0.55)', 'rgba(255,138,0,0.55)'];

export default function Store() {
  const [activeCat, setActiveCat] = useState('All');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(getCartCount());

  // Refresh badge when returning from cart
  useFocusEffect(useCallback(() => { setCartCount(getCartCount()); }, []));

  useEffect(() => {
    setLoading(true);
    storeApi.products(activeCat !== 'All' ? activeCat.toLowerCase() : undefined)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.products || data?.data || [];
        setProducts(list.length > 0 ? list : FALLBACK_PRODUCTS.filter((p) => activeCat === 'All' || p.category === activeCat));
      })
      .catch(() => setProducts(FALLBACK_PRODUCTS.filter((p) => activeCat === 'All' || p.category === activeCat)))
      .finally(() => setLoading(false));
  }, [activeCat]);

  const handleAddToCart = (product: any) => {
    addToCart({
      productId: String(product.id || product._id),
      name: product.name || product.productName || 'Product',
      price: product.price ?? product.mrp ?? 0,
      image: product.img || product.imageUrl || product.image,
      category: product.category,
    });
    setCartCount(getCartCount());
  };

  return (
    <AuroraBackground>
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.titleRow}>
          <Text style={s.title}>Store</Text>
          <TouchableOpacity style={s.cartWrap} onPress={() => router.push('/cart' as any)}>
            <IconCart size={20} color={colors.t} />
            {cartCount > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
          {CATS.map((c) => (
            <TouchableOpacity key={c} style={[s.pill, activeCat === c && s.pillActive]} onPress={() => setActiveCat(c)}>
              <Text style={[s.pillText, activeCat === c && s.pillTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : products.length === 0 ? (
          <View style={s.emptyState}>
            <IconTag size={40} color={colors.accent} />
            <Text style={s.emptyTitle}>No products found</Text>
            <Text style={s.emptyBody}>Check back later for {activeCat} products</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {products.map((p: any, idx: number) => {
              const name = p.name || p.productName || 'Product';
              const brand = p.brand || p.brandName || '';
              const price = p.price || p.mrp || 0;
              const img = p.image || p.images?.[0] || p.img || DUMMY_IMAGES[p.category] || DUMMY_IMAGES.default;
              const aurora = p.aurora || AURORA_COLORS[idx % AURORA_COLORS.length];
              return (
                <TouchableOpacity key={p.id || p._id || idx} style={s.card} activeOpacity={0.9} onPress={() => router.push(`/product/${p.id || p._id}`)}>
                  <ImageBackground source={{ uri: img }} style={s.cardImg} imageStyle={{ borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
                    <View style={[s.cardAurora, { backgroundColor: aurora }]} />
                    <View style={s.cardDark} />
                  </ImageBackground>
                  <View style={s.cardBody}>
                    <Text style={s.prodName} numberOfLines={1}>{name}</Text>
                    {!!brand && <Text style={s.prodBrand}>{brand}</Text>}
                    <View style={s.priceRow}>
                      <Text style={s.prodPrice}>₹{Number(price).toLocaleString('en-IN')}</Text>
                      <TouchableOpacity style={s.cartBtn} onPress={() => handleAddToCart(p)}>
                        <IconCart size={14} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  container: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: '#fff', letterSpacing: -0.5 },
  cartWrap: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cartBadge: {
    position: 'absolute', top: 0, right: 0, width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { fontFamily: fonts.sansBold, fontSize: 9, color: '#000' },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  pillText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t2 },
  pillTextActive: { color: colors.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%', borderRadius: radius.xl, overflow: 'hidden',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 2,
  },
  cardImg: { height: 120, position: 'relative' },
  cardAurora: { ...StyleSheet.absoluteFillObject, opacity: 0.6 },
  cardDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  cardBody: { padding: 10 },
  prodName: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  prodBrand: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  prodPrice: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.accent },
  cartBtn: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff' },
  emptyBody: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
});
