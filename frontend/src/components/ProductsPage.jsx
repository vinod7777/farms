import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AddressManager from './AddressManager';

export default function ProductsPage({ token }) {
  const [products, setProducts] = useState([]);
  const [locality, setLocality] = useState('');
  const [loading, setLoading] = useState(true);

  // Buy Now Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [selectedAddressText, setSelectedAddressText] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [locality]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url = locality ? `api/products.php?locality=${encodeURIComponent(locality)}` : 'api/products.php';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingCart = JSON.parse(localStorage.getItem('sb_cart') || '[]');
    const itemIndex = existingCart.findIndex(item => item.id === product.id);
    
    let currentQty = 0;
    if (itemIndex > -1) {
      currentQty = existingCart[itemIndex].cartQuantity;
    }
    
    if (currentQty + 1 > product.stock_quantity) {
      alert(`Cannot add more. Only ${product.stock_quantity} ${product.unit || 'kg'} available in stock.`);
      return;
    }
    
    if (itemIndex > -1) {
      existingCart[itemIndex].cartQuantity += 1;
    } else {
      existingCart.push({ ...product, cartQuantity: 1 });
    }
    
    localStorage.setItem('sb_cart', JSON.stringify(existingCart));
    alert(`${product.name} added to Shopping Cart!`);
  };

  const openBuyNow = (product) => {
    setSelectedProduct(product);
    setBuyQuantity(1);
    setSelectedAddressText('');
    setShowModal(true);
  };

  const handleBuyNow = async (e) => {
    e.preventDefault();
    if (!selectedAddressText) {
      alert("Please select or add a delivery address.");
      return;
    }
    setOrderLoading(true);
    try {
      const fullAddress = selectedAddressText;

      const res = await fetch('api/orders.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          item_type: buyQuantity >= 15 ? 'bulk' : 'product', 
          item_id: selectedProduct.id, 
          quantity: buyQuantity,
          address: fullAddress
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Order placed successfully! Check My Orders.');
        setShowModal(false);
      } else {
        alert(data.error || 'Failed to place order');
      }
    } catch (e) {
      alert('Error placing order');
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div className="w-full relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Products Catalog</h2>
        <select 
          value={locality} 
          onChange={(e) => setLocality(e.target.value)}
          className="border border-slate-300 rounded-lg px-4 py-2 text-sm font-medium focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">All Localities</option>
          <option value="Hyderabad">Hyderabad</option>
          <option value="Bangalore">Bangalore</option>
          <option value="Vijayawada">Vijayawada</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-medium">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-slate-500 font-medium">No products found for this locality.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {products.map(p => (
            <motion.div key={p.id} whileHover={{ y: -5 }} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="h-48 bg-slate-100 flex items-center justify-center">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                )}
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-bold text-lg text-slate-800 mb-1">{p.name}</h3>
                <p className="text-xs font-semibold text-emerald-600 mb-3 uppercase tracking-wider">{p.locality || 'Global'}</p>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2 flex-grow">{p.description}</p>
                <div className="flex justify-between items-center mb-4">
                  <div className="font-extrabold text-xl text-emerald-600">₹{parseFloat(p.price).toFixed(2)}</div>
                  <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">
                    {p.stock_quantity > 0 ? `Stock: ${p.stock_quantity} ${p.unit || 'kg'}` : <span className="text-red-500">Out of Stock</span>}
                  </div>
                </div>
                
                {p.stock_quantity > 0 ? (
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button onClick={() => openBuyNow(p)} className="bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg text-xs font-bold transition-colors">Buy Now</button>
                    <button onClick={() => addToCart(p)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2 rounded-lg text-xs font-bold transition-colors">Add to Cart</button>
                  </div>
                ) : (
                  <div className="mt-auto bg-slate-100 text-slate-400 py-2 rounded-lg text-xs font-bold text-center border border-slate-200">
                    Currently Unavailable
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Buy Now Modal */}
      <AnimatePresence>
        {showModal && selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          >
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-5xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 font-bold">X</button>
              
              <h2 className="text-2xl font-black mb-6 text-slate-800">Checkout</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto custom-scrollbar pr-2 pb-2">
                
                {/* Left Column: Product & Order Details */}
                <div className="space-y-6 flex flex-col">
                  <div className="flex gap-4 p-4 border border-emerald-100 bg-emerald-50 rounded-2xl">
                    {selectedProduct.image_url && <img src={selectedProduct.image_url} alt="" className="w-20 h-20 rounded-xl object-cover" />}
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{selectedProduct.name}</h4>
                      <div className="text-emerald-600 font-bold">₹{parseFloat(selectedProduct.price).toFixed(2)} / {selectedProduct.unit || 'unit'}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{selectedProduct.locality || 'Global'}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</label>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Max: {selectedProduct.stock_quantity} {selectedProduct.unit || 'kg'}</span>
                    </div>
                    <input type="number" min="1" max={selectedProduct.stock_quantity} required value={buyQuantity} onChange={e => {
                      const val = parseInt(e.target.value) || 1;
                      if (val > selectedProduct.stock_quantity) {
                        alert(`Only ${selectedProduct.stock_quantity} ${selectedProduct.unit || 'kg'} in stock!`);
                        setBuyQuantity(selectedProduct.stock_quantity);
                      } else {
                        setBuyQuantity(val);
                      }
                    }} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition text-lg font-bold" />
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center py-2 border-b border-slate-200 mb-2">
                      <span className="text-slate-500 font-bold">Subtotal:</span>
                      <span className="text-lg font-bold text-slate-700">₹{(buyQuantity * parseFloat(selectedProduct.price)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-800 font-black text-lg">Total:</span>
                      <span className="text-3xl font-black text-emerald-600">₹{(buyQuantity * parseFloat(selectedProduct.price)).toFixed(2)}</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleBuyNow}
                    disabled={orderLoading || !selectedAddressText} 
                    className={`w-full font-black text-lg py-4 rounded-xl text-white shadow-xl transition ${orderLoading || !selectedAddressText ? 'bg-slate-300 shadow-none cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30'}`}
                  >
                    {orderLoading ? 'Processing...' : 'Confirm Order'}
                  </button>
                  {!selectedAddressText && <p className="text-center text-xs text-red-500 font-bold mt-2">Please select an address first.</p>}
                </div>

                {/* Right Column: Address Manager */}
                <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8">
                  <AddressManager token={token} onAddressChange={setSelectedAddressText} />
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
