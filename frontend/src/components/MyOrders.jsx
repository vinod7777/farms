import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyOrders({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('api/orders.php', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const groupedOrders = React.useMemo(() => {
    const groups = {};
    const result = [];
    orders.forEach(o => {
      if (o.order_group_id) {
        if (!groups[o.order_group_id]) {
          groups[o.order_group_id] = {
            id: o.order_group_id,
            isGroup: true,
            status: o.status,
            created_at: o.created_at,
            address: o.address,
            items: [o],
            totalAmount: (parseFloat(o.product_price) * parseInt(o.quantity))
          };
          result.push(groups[o.order_group_id]);
        } else {
          groups[o.order_group_id].items.push(o);
          groups[o.order_group_id].totalAmount += (parseFloat(o.product_price) * parseInt(o.quantity));
        }
      } else {
        result.push({
          id: o.id,
          isGroup: false,
          status: o.status,
          created_at: o.created_at,
          address: o.address,
          items: [o],
          totalAmount: (parseFloat(o.product_price) * parseInt(o.quantity))
        });
      }
    });
    return result;
  }, [orders]);

  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'completed': case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const renderStatusTracker = (status) => {
    const s = status.toLowerCase();
    const steps = ['Pending', 'Approved', 'Shipped', 'Delivered'];
    let currentStep = 0;
    if (s === 'approved') currentStep = 1;
    if (s === 'shipped') currentStep = 2;
    if (s === 'delivered' || s === 'completed') currentStep = 3;
    if (s === 'cancelled' || s === 'rejected') return <div className="text-red-500 font-bold">Order Cancelled</div>;

    return (
      <div className="flex items-center justify-between w-full mt-4 mb-2 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-500" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}></div>
        {steps.map((step, idx) => (
          <div key={step} className="relative z-10 flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${idx <= currentStep ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-200 text-slate-400'}`}>
              {idx < currentStep ? '✓' : (idx + 1)}
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-bold mt-2 ${idx <= currentStep ? 'text-emerald-700' : 'text-slate-400'}`}>{step}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <h2 className="text-3xl font-black text-slate-800 mb-8">My Orders</h2>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      ) : groupedOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-200">
          <img src="https://cdn-icons-png.flaticon.com/512/2038/2038854.png" alt="Empty" className="w-24 h-24 mx-auto mb-4 opacity-50 grayscale" />
          <p className="text-slate-500 font-bold text-lg">No orders found</p>
          <p className="text-slate-400 text-sm mt-1">Looks like you haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedOrders.map((order, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              key={order.id} 
              onClick={() => setSelectedOrder(order)}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
            >
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-4">
                    {order.items.slice(0, 3).map((item, i) => (
                      <div key={i} className="w-16 h-16 rounded-xl border-2 border-white bg-slate-100 overflow-hidden shadow-sm z-10 relative">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs bg-slate-100">No Img</div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-16 h-16 rounded-xl border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm z-0">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">
                      {order.isGroup ? `Order of ${order.items.length} items` : order.items[0].item_name}
                    </h4>
                    <p className="text-xs font-bold text-slate-500">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Amount</p>
                    <p className="text-xl font-black text-slate-800">₹{order.totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</p>
                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="hidden md:block text-slate-300 group-hover:text-emerald-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>

              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detailed Order Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-200">
                <button onClick={() => setSelectedOrder(null)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 font-bold shadow-sm">X</button>
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Order Details</h2>
                    <p className="text-sm font-bold text-slate-500 mt-1">Order ID: #{selectedOrder.id}</p>
                    <p className="text-xs font-semibold text-slate-400">Placed on {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Order Total</p>
                    <p className="text-3xl font-black text-emerald-600">₹{selectedOrder.totalAmount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  {renderStatusTracker(selectedOrder.status)}
                </div>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-grow">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b pb-2">Delivery Address</h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line text-sm font-medium text-slate-700 leading-relaxed">
                      {selectedOrder.address || 'No address provided.'}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b pb-2">Payment Information</h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-600">Payment Method</span>
                        <span className="text-sm font-bold text-slate-800">Cash on Delivery</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600">Payment Status</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${selectedOrder.status === 'completed' || selectedOrder.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                          {selectedOrder.status === 'completed' || selectedOrder.status === 'delivered' ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 border-b pb-2">Items in this Order ({selectedOrder.items.length})</h4>
                  <div className="space-y-4">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="flex gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-emerald-200 transition-colors">
                        <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-[10px] bg-slate-100">No Image</div>
                          )}
                        </div>
                        <div className="flex-grow flex flex-col justify-center">
                          <h5 className="font-bold text-slate-800 text-lg">{item.item_name}</h5>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Type: {item.item_type.replace('_', ' ')}</p>
                        </div>
                        <div className="text-right flex flex-col justify-center border-l border-slate-100 pl-4">
                          <p className="text-sm font-bold text-slate-500 mb-1">{item.quantity} x ₹{parseFloat(item.product_price).toFixed(2)}</p>
                          <p className="text-lg font-black text-slate-800">₹{(parseInt(item.quantity) * parseFloat(item.product_price)).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
