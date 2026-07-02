import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AddressManager from './AddressManager';

export default function BulkOrdersPage({ token }) {
  const [cartItems, setCartItems] = useState([]);
  const [selectedAddressText, setSelectedAddressText] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const storedCart = JSON.parse(localStorage.getItem('sb_cart') || '[]');
    setCartItems(storedCart);
  };

  const saveCart = (newCart) => {
    localStorage.setItem('sb_cart', JSON.stringify(newCart));
    setCartItems(newCart);
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updated = [...cartItems];
    const maxQty = updated[index].stock_quantity;
    
    if (maxQty !== undefined && newQuantity > maxQty) {
      alert(`Only ${maxQty} ${updated[index].unit || 'kg'} in stock for ${updated[index].name}!`);
      updated[index].cartQuantity = parseInt(maxQty);
    } else {
      updated[index].cartQuantity = parseInt(newQuantity);
    }
    
    saveCart(updated);
  };

  const removeItem = (index) => {
    const updated = cartItems.filter((_, i) => i !== index);
    saveCart(updated);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    if (!selectedAddressText) {
      alert("Please select or add a delivery address.");
      return;
    }
    
    setOrderLoading(true);
    try {
      const itemsPayload = cartItems.map(item => ({
        item_type: 'bulk',
        item_id: item.id,
        quantity: item.cartQuantity
      }));

      const fullAddress = selectedAddressText;

      const res = await fetch('api/orders.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: itemsPayload, address: fullAddress })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('All items ordered successfully! Check My Orders.');
        saveCart([]); // empty cart
      } else {
        alert(data.error || 'Failed to place bulk order');
      }
    } catch (e) {
      alert('Error placing order');
    } finally {
      setOrderLoading(false);
    }
  };

  const cartTotal = cartItems.reduce((acc, item) => acc + (parseFloat(item.price) * item.cartQuantity), 0);

  return (
    <div className="w-full">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Shopping Cart</h2>
        <p className="text-slate-600 font-medium">Review your selected products before placing the final order.</p>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-20 text-slate-500 font-medium bg-slate-50 rounded-3xl border border-slate-100">Your cart is empty. Add items from the Products catalog!</div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="w-full lg:w-2/3 space-y-4">
            <AnimatePresence>
              {cartItems.map((item, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center"
                >
                  <div className="w-24 h-24 bg-slate-100 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-400 text-xs">No img</span>
                    )}
                  </div>
                  
                  <div className="flex-grow text-center sm:text-left">
                    <h3 className="font-bold text-lg text-slate-900">{item.name}</h3>
                    <p className="text-xs text-slate-500 mb-2">Price: ₹{parseFloat(item.price).toFixed(2)}</p>
                    <div className="flex items-center justify-center sm:justify-start gap-3">
                      <label className="text-xs font-bold text-slate-500 uppercase">Qty:</label>
                      <input 
                        type="number" min="1" max={item.stock_quantity}
                        value={item.cartQuantity} 
                        onChange={(e) => updateQuantity(idx, e.target.value)}
                        className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-center font-bold focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3 justify-center min-w-[100px]">
                    <div className="font-black text-xl text-emerald-600">₹{(parseFloat(item.price) * item.cartQuantity).toFixed(2)}</div>
                    <button 
                      onClick={() => removeItem(idx)}
                      className="text-xs text-red-500 hover:text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-lg transition"
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="w-full lg:w-1/3">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sticky top-24 shadow-xl shadow-slate-200/50">
              <h3 className="text-xl font-black mb-6">Order Summary</h3>
              
              <div className="space-y-3 mb-6 pb-6 border-b border-slate-100">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Shipping</span>
                  <span className="text-emerald-500 font-bold">Free</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold">Total</span>
                <span className="text-3xl font-black text-emerald-600">₹{cartTotal.toFixed(2)}</span>
              </div>

              <form onSubmit={handleCheckout} className="space-y-4">
                <AddressManager token={token} onAddressChange={setSelectedAddressText} />

                <button 
                  type="submit" 
                  disabled={orderLoading || cartItems.length === 0 || !selectedAddressText} 
                  className={`w-full font-black text-lg py-4 rounded-2xl text-white shadow-xl transition mt-4 ${
                    orderLoading || cartItems.length === 0 || !selectedAddressText ? 'bg-slate-300 shadow-none cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  {orderLoading ? 'Processing...' : 'Place Order'}
                </button>
                {!selectedAddressText && <p className="text-center text-xs text-red-500 font-bold mt-2">Please select an address first.</p>}
              </form>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
