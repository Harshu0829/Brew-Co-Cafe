import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cart Store — persists to localStorage
 * Items: { id, name, price, quantity, customisation_note, image_url }
 */
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      discount: 0,
      pickupTime: null,

      /** Add item or increment quantity */
      addItem: (item) => {
        const items = get().items;
        const existing = items.find((i) => i.id === item.id);
        if (existing) {
          set({ items: items.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) });
        } else {
          set({ items: [...items, { ...item, quantity: 1 }] });
        }
      },

      /** Remove item completely */
      removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

      /** Change quantity — removes item when qty reaches 0 */
      updateQty: (id, qty) => {
        if (qty <= 0) { get().removeItem(id); return; }
        set({ items: get().items.map((i) => i.id === id ? { ...i, quantity: qty } : i) });
      },

      /** Set customisation note for an item */
      setNote: (id, note) =>
        set({ items: get().items.map((i) => i.id === id ? { ...i, customisation_note: note } : i) }),

      setPromoCode: (code, discount) => set({ promoCode: code, discount }),
      clearPromo: () => set({ promoCode: null, discount: 0 }),
      setPickupTime: (time) => set({ pickupTime: time }),
      clearCart: () => set({ items: [], promoCode: null, discount: 0, pickupTime: null }),

      // ── Selectors (exported separately below) ──────────────────────────
    }),
    { name: 'brewco-cart' }
  )
);

// ── Selectors — use these in components for reactive computed values ──────
/** Total before discount */
export const selectSubtotal = (s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

/** After discount, before tax */
export const selectDiscount = (s) => s.discount;

/** Item count badge number */
export const selectItemCount = (s) => s.items.reduce((sum, i) => sum + i.quantity, 0);

/** Final total after discount and 5% tax */
export const selectTotal = (s) => {
  const taxable = Math.max(0, selectSubtotal(s) - selectDiscount(s));
  return Math.round(taxable * 1.05);
};
