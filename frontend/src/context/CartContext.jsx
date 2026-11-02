// frontend/src/context/CartContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('w4eh_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('w4eh_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, qty = 1) => {
    const quantity = parseInt(qty, 10) || 1;
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prev, {
          product_id: product.id,
          name: product.name,
          volume_label: product.volume_label,
          packaging_type: product.packaging_type,
          unit_price: parseFloat(product.unit_price),
          refundable_deposit: parseFloat(product.refundable_deposit || 0),
          is_reusable: !!product.is_reusable,
          available_quantity: product.available_quantity,
          quantity: quantity
        }];
      }
    });
  };

  const updateQuantity = (productId, newQty) => {
    const quantity = parseInt(newQty, 10);
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(prev =>
        prev.map(item =>
          item.product_id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const cartDeposit = cart.reduce((sum, item) => sum + (item.refundable_deposit * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      cartCount,
      cartSubtotal: Math.round(cartSubtotal * 100) / 100,
      cartDeposit: Math.round(cartDeposit * 100) / 100
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
