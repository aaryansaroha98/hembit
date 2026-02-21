import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const raw = localStorage.getItem('hembit_cart');
    return raw ? JSON.parse(raw) : [];
  });

  const persist = (nextItems) => {
    setItems(nextItems);
    localStorage.setItem('hembit_cart', JSON.stringify(nextItems));
  };

  const addItem = (product, size = 'M', quantity = 1) => {
    const existing = items.find((item) => item.productId === product.id && item.size === size);

    if (existing) {
      const updated = items.map((item) =>
        item.productId === product.id && item.size === size
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      persist(updated);
      return;
    }

    const next = [
      ...items,
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images?.[0] || '',
        price: product.price,
        size,
        quantity,
      },
    ];
    persist(next);
  };

  const removeItem = (productId, size) => {
    persist(items.filter((item) => !(item.productId === productId && item.size === size)));
  };

  const updateQty = (productId, size, quantity) => {
    if (quantity < 1) {
      removeItem(productId, size);
      return;
    }

    persist(
      items.map((item) =>
        item.productId === productId && item.size === size ? { ...item, quantity } : item
      )
    );
  };

  const clear = () => {
    persist([]);
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 0 ? 150 : 0;
    return {
      subtotal,
      shipping,
      total: subtotal + shipping,
    };
  }, [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clear, totals }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return ctx;
}
