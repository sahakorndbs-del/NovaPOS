import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { ViewState, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  DollarSign, ShoppingBag, AlertTriangle, TrendingUp, Sparkles, 
  Bell, X, CheckCircle, Store, PiggyBank, Briefcase, Plus, 
  Package, ArrowRight, ExternalLink, Settings, Check, CheckCheck, RefreshCw, AlertCircle
} from 'lucide-react';
import { analyzeSalesData, generateLocalSalesInsight } from '../services/geminiService';
import { getLocalDateString } from '../lib/dateUtils';

interface DashboardProps {
  setView?: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  const { 
    stats, orders, storeConfig, products, currentThemeColorHex, 
    updateProduct, restockRequests, unreadAlertCount, 
    markAllNotificationsAsRead, markNotificationAsRead, readAlertIds 
  } = useStore();

  const [aiInsight, setAiInsight] = useState<string>(() => generateLocalSalesInsight(stats));
  const [loadingAi, setLoadingAi] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'unread' | 'out' | 'low' | 'restock'>('all');
  const [restockedItemId, setRestockedItemId] = useState<string | null>(null);

  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Categorize alerts
  const lowStockThreshold = storeConfig.lowStockThreshold || 10;
  const outOfStockItems = products.filter(p => p.stock === 0);
  const lowStockOnlyItems = products.filter(p => p.stock > 0 && p.stock < lowStockThreshold);
  const lowStockItems = products.filter(p => p.stock < lowStockThreshold);
  const pendingRestockRequests = restockRequests ? restockRequests.filter(r => r.status === 'pending') : [];
  
  const totalAlertsCount = lowStockItems.length + pendingRestockRequests.length;

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    try {
      const insight = await analyzeSalesData(stats, orders.length, storeConfig.aiApiKey);
      setAiInsight(insight);
    } catch (e) {
      setAiInsight(generateLocalSalesInsight(stats));
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (storeConfig.aiApiKey) {
      handleGenerateInsight();
    } else {
      setAiInsight(generateLocalSalesInsight(stats));
    }
  }, [stats.todaySales, stats.orderCount, storeConfig.aiApiKey]);

  const handleQuickRestock = (product: Product, amount: number) => {
    const currentStock = Number(product.stock) || 0;
    updateProduct({
      ...product,
      stock: currentStock + amount
    });
    // Also mark as read
    markNotificationAsRead(product.id);
    setRestockedItemId(product.id);
    setTimeout(() => {
      setRestockedItemId(null);
    }, 1800);
  };

  // Format data for chart
  const last7DaysData = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = getLocalDateString(d);
    const dayOrders = orders.filter(o => getLocalDateString(o.timestamp) === dateStr);
    return {
      name: d.toLocaleDateString('th-TH', { weekday: 'short' }),
      sales: dayOrders.reduce((sum, o) => sum + o.total, 0)
    };
  });

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50/50">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
             {storeConfig.logoUrl ? (
                <img src={storeConfig.logoUrl} className="w-12 h-12 object-contain" alt="Logo" />
             ) : (
                <Store size={32} className="text-primary-600" />
             )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{storeConfig.name}</h1>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
               ระบบพร้อมใช้งาน • {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {/* Actions & Notifications */}
        <div className="flex items-center gap-3">
           {/* Notification Bell Dropdown Container */}
           <div className="relative" ref={notificationRef}>
             <button 
               onClick={() => {
                 setShowNotifications(prev => {
                   const next = !prev;
                   if (next) {
                     // Auto mark all notifications as read when opening to view them
                     markAllNotificationsAsRead();
                   }
                   return next;
                 });
               }}
               className={`p-3 bg-white rounded-xl border transition-all shadow-sm relative flex items-center justify-center ${
                 showNotifications 
                   ? 'border-primary-500 text-primary-600 ring-2 ring-primary-100 shadow-md' 
                   : 'border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200'
               }`}
               title="การแจ้งเตือนสต็อกและคำขอ"
               aria-label="แจ้งเตือน"
             >
               <Bell size={20} className={unreadAlertCount > 0 ? 'text-amber-500 animate-bounce' : 'text-slate-500'} />
               {unreadAlertCount > 0 && (
                 <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                   {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
                 </span>
               )}
             </button>

             {/* Notifications Popup Menu */}
             {showNotifications && (
               <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 md:w-[440px] max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                 {/* Popup Header */}
                 <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                   <div className="flex items-center gap-2.5">
                     <div className="p-2 bg-slate-800 rounded-xl text-primary-400">
                       <Bell size={18} />
                     </div>
                     <div>
                       <h3 className="font-bold text-sm tracking-tight">การแจ้งเตือน</h3>
                       <p className="text-[11px] text-slate-400">
                         {unreadAlertCount > 0 
                           ? `มี ${unreadAlertCount} รายการใหม่ที่ยังไม่ได้อ่าน` 
                           : 'อ่านครบทุกรายการแล้ว'}
                       </p>
                     </div>
                   </div>

                   <div className="flex items-center gap-2">
                     {unreadAlertCount > 0 ? (
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           markAllNotificationsAsRead();
                         }}
                         className="text-xs bg-primary-600 hover:bg-primary-500 text-white font-bold py-1 px-2.5 rounded-lg flex items-center gap-1 transition-all shadow-xs"
                         title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
                       >
                         <CheckCheck size={14} /> อ่านแล้วทั้งหมด
                       </button>
                     ) : (
                       <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 font-bold py-1 px-2 rounded-lg flex items-center gap-1">
                         <Check size={12} /> อ่านแล้วทั้งหมด
                       </span>
                     )}
                     <button 
                       onClick={() => setShowNotifications(false)}
                       className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                     >
                       <X size={18} />
                     </button>
                   </div>
                 </div>

                 {/* Filter Tabs */}
                 <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 gap-1 text-xs font-bold text-slate-600">
                   <button 
                     onClick={() => setNotificationTab('all')}
                     className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                       notificationTab === 'all' 
                         ? 'bg-white text-primary-700 shadow-xs font-black' 
                         : 'hover:bg-slate-100 text-slate-500'
                     }`}
                   >
                     ทั้งหมด ({totalAlertsCount})
                   </button>
                   {unreadAlertCount > 0 && (
                     <button 
                       onClick={() => setNotificationTab('unread')}
                       className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                         notificationTab === 'unread' 
                           ? 'bg-blue-50 text-blue-700 shadow-xs font-black' 
                           : 'hover:bg-slate-100 text-slate-500'
                       }`}
                     >
                       ยังไม่อ่าน ({unreadAlertCount})
                     </button>
                   )}
                   <button 
                     onClick={() => setNotificationTab('out')}
                     className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                       notificationTab === 'out' 
                         ? 'bg-red-50 text-red-700 shadow-xs font-black' 
                         : 'hover:bg-slate-100 text-slate-500'
                     }`}
                   >
                     หมด ({outOfStockItems.length})
                   </button>
                   <button 
                     onClick={() => setNotificationTab('low')}
                     className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                       notificationTab === 'low' 
                         ? 'bg-amber-50 text-amber-700 shadow-xs font-black' 
                         : 'hover:bg-slate-100 text-slate-500'
                     }`}
                   >
                     ใกล้หมด ({lowStockOnlyItems.length})
                   </button>
                   {pendingRestockRequests.length > 0 && (
                     <button 
                       onClick={() => setNotificationTab('restock')}
                       className={`flex-1 py-1.5 px-2 rounded-xl transition-all ${
                         notificationTab === 'restock' 
                           ? 'bg-indigo-50 text-indigo-700 shadow-xs font-black' 
                           : 'hover:bg-slate-100 text-slate-500'
                       }`}
                     >
                       คำขอ ({pendingRestockRequests.length})
                     </button>
                   )}
                 </div>

                 {/* Notifications List */}
                 <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                   {totalAlertsCount === 0 ? (
                     <div className="p-8 text-center">
                       <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                         <CheckCircle size={28} />
                       </div>
                       <h4 className="font-bold text-slate-800 text-sm mb-1">สต็อกสินค้าปกติทั้งหมด</h4>
                       <p className="text-xs text-slate-400">
                         ไม่มีสินค้าที่หมดสต็อกหรือต่ำกว่าเกณฑ์ {storeConfig.lowStockThreshold} ชิ้น
                       </p>
                     </div>
                   ) : (
                     <>
                       {/* Render Out of Stock Items */}
                       {(notificationTab === 'all' || notificationTab === 'out' || (notificationTab === 'unread' && outOfStockItems.some(i => !readAlertIds.includes(i.id)))) && 
                         outOfStockItems
                           .filter(item => notificationTab !== 'unread' || !readAlertIds.includes(item.id))
                           .map(item => {
                             const isRead = readAlertIds.includes(item.id);
                             return (
                               <div 
                                 key={item.id} 
                                 onClick={() => markNotificationAsRead(item.id)}
                                 className={`p-3.5 hover:bg-slate-50 transition-colors flex items-center gap-3 cursor-pointer ${
                                   !isRead ? 'bg-red-50/30' : ''
                                 }`}
                               >
                                 <div className="relative flex-shrink-0">
                                   {item.image ? (
                                     <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-xs" />
                                   ) : (
                                     <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                                       <Package size={22} />
                                     </div>
                                   )}
                                   {!isRead && (
                                     <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-white shadow-xs"></span>
                                   )}
                                 </div>

                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-1.5 mb-0.5">
                                     <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md">
                                       หมดสต็อก
                                     </span>
                                     {isRead ? (
                                       <span className="text-[10px] text-slate-400 font-medium">อ่านแล้ว</span>
                                     ) : (
                                       <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-md">ใหม่</span>
                                     )}
                                   </div>
                                   <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                   <p className="text-xs text-red-600 font-semibold">คงเหลือ 0 ชิ้น</p>
                                 </div>

                                 {/* Quick Restock Action */}
                                 <div className="flex flex-col items-end gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                   {restockedItemId === item.id ? (
                                     <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg">
                                       <Check size={12} /> เติมแล้ว!
                                     </span>
                                   ) : (
                                     <div className="flex items-center gap-1">
                                       <button
                                         onClick={() => handleQuickRestock(item, 10)}
                                         className="px-2 py-1 bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-primary-100 shadow-xs"
                                         title="เติมสต็อกทันที +10"
                                       >
                                         +10
                                       </button>
                                       <button
                                         onClick={() => handleQuickRestock(item, 50)}
                                         className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-700 hover:text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                         title="เติมสต็อกทันที +50"
                                       >
                                         +50
                                       </button>
                                     </div>
                                   )}
                                 </div>
                               </div>
                             );
                           })}

                       {/* Render Low Stock Items */}
                       {(notificationTab === 'all' || notificationTab === 'low' || (notificationTab === 'unread' && lowStockOnlyItems.some(i => !readAlertIds.includes(i.id)))) && 
                         lowStockOnlyItems
                           .filter(item => notificationTab !== 'unread' || !readAlertIds.includes(item.id))
                           .map(item => {
                             const isRead = readAlertIds.includes(item.id);
                             return (
                               <div 
                                 key={item.id} 
                                 onClick={() => markNotificationAsRead(item.id)}
                                 className={`p-3.5 hover:bg-slate-50 transition-colors flex items-center gap-3 cursor-pointer ${
                                   !isRead ? 'bg-amber-50/30' : ''
                                 }`}
                               >
                                 <div className="relative flex-shrink-0">
                                   {item.image ? (
                                     <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-xs" />
                                   ) : (
                                     <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                                       <Package size={22} />
                                     </div>
                                   )}
                                   {!isRead && (
                                     <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-xs"></span>
                                   )}
                                 </div>

                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-1.5 mb-0.5">
                                     <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">
                                       ใกล้หมด
                                     </span>
                                     {isRead ? (
                                       <span className="text-[10px] text-slate-400 font-medium">อ่านแล้ว</span>
                                     ) : (
                                       <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-md">ใหม่</span>
                                     )}
                                   </div>
                                   <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                   <p className="text-xs text-amber-600 font-bold">
                                     เหลือ {item.stock} ชิ้น (เกณฑ์: {lowStockThreshold})
                                   </p>
                                 </div>

                                 {/* Quick Restock Action */}
                                 <div className="flex flex-col items-end gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                   {restockedItemId === item.id ? (
                                     <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg">
                                       <Check size={12} /> เติมแล้ว!
                                     </span>
                                   ) : (
                                     <div className="flex items-center gap-1">
                                       <button
                                         onClick={() => handleQuickRestock(item, 10)}
                                         className="px-2 py-1 bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-primary-100 shadow-xs"
                                         title="เติมสต็อกทันที +10"
                                       >
                                         +10
                                       </button>
                                       <button
                                         onClick={() => handleQuickRestock(item, 50)}
                                         className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-700 hover:text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                         title="เติมสต็อกทันที +50"
                                       >
                                         +50
                                       </button>
                                     </div>
                                   )}
                                 </div>
                               </div>
                             );
                           })}

                       {/* Render Pending Restock Requests */}
                       {(notificationTab === 'all' || notificationTab === 'restock' || (notificationTab === 'unread' && pendingRestockRequests.some(r => !readAlertIds.includes(r.id)))) && 
                         pendingRestockRequests
                           .filter(req => notificationTab !== 'unread' || !readAlertIds.includes(req.id))
                           .map(req => {
                             const isRead = readAlertIds.includes(req.id);
                             return (
                               <div 
                                 key={req.id} 
                                 onClick={() => markNotificationAsRead(req.id)}
                                 className="p-3.5 hover:bg-slate-50 transition-colors flex items-center gap-3 bg-indigo-50/20 cursor-pointer"
                               >
                                 <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl flex-shrink-0 relative">
                                   <AlertCircle size={20} />
                                   {!isRead && (
                                     <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white"></span>
                                   )}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-1.5 mb-0.5">
                                     <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md">
                                       ลูกค้าขอเติม
                                     </span>
                                     {isRead && <span className="text-[10px] text-slate-400 font-medium">อ่านแล้ว</span>}
                                   </div>
                                   <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{req.productName}</p>
                                   <p className="text-xs text-slate-500 truncate">
                                     ลูกค้า: {req.customerName} ({req.contactInfo})
                                   </p>
                                 </div>
                               </div>
                             );
                           })}
                     </>
                   )}
                 </div>

                 {/* Popup Footer Actions */}
                 <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                   {setView && (
                     <button
                       onClick={() => {
                         setShowNotifications(false);
                         markAllNotificationsAsRead();
                         setView('products');
                       }}
                       className="font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-primary-50 transition-colors"
                     >
                       จัดการสต็อกทั้งหมด <ArrowRight size={14} />
                     </button>
                   )}
                   {setView && (
                     <button
                       onClick={() => {
                         setShowNotifications(false);
                         setView('settings');
                       }}
                       className="text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-slate-200 transition-colors"
                     >
                       <Settings size={13} /> ตั้งค่าเกณฑ์
                     </button>
                   )}
                 </div>
               </div>
             )}
           </div>

           {/* AI Insight Button */}
           <button 
             onClick={handleGenerateInsight}
             className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all font-bold text-sm"
           >
             <Sparkles size={18} className={loadingAi ? 'animate-spin' : ''} />
             {loadingAi ? 'กำลังวิเคราะห์...' : 'AI วิเคราะห์ด่วน'}
           </button>
        </div>
      </div>

      {/* AI Insight Section */}
      <div className="mb-8 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles size={120} className="text-indigo-600" />
        </div>
        <h3 className="text-indigo-800 font-black flex items-center gap-2 mb-3 uppercase tracking-wider text-xs">
          <Sparkles size={16} /> Nova Intelligence Insight
        </h3>
        <p className="text-slate-700 text-lg font-medium italic relative z-10 leading-relaxed">
          "{aiInsight}"
        </p>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'ยอดขายวันนี้', val: stats.todaySales, icon: DollarSign, color: 'emerald' },
          { label: 'ต้นทุนวันนี้', val: stats.todayCost, icon: PiggyBank, color: 'amber' },
          { label: 'กำไรวันนี้', val: stats.todayProfit, icon: TrendingUp, color: 'primary' },
          { label: 'กำไรเดือนนี้', val: stats.monthlyProfit, icon: Briefcase, color: 'indigo' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className={`p-3 w-fit rounded-2xl bg-${item.color}-50 text-${item.color}-600 mb-4 group-hover:scale-110 transition-transform`}>
              <item.icon size={24} />
            </div>
            <p className="text-slate-500 text-sm font-bold mb-1 uppercase tracking-tight">{item.label}</p>
            <h3 className="text-2xl font-black text-slate-800">
               {storeConfig.currency}{item.val.toLocaleString()}
            </h3>
          </div>
        ))}
      </div>

      {/* Charts & Restock Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-primary-600" /> สถิติยอดขาย 7 วันล่าสุด
            </h3>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue Chart</div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: any) => [`${v.toLocaleString()} ${storeConfig.currency}`, 'ยอดขาย']}
                />
                <Bar dataKey="sales" fill={currentThemeColorHex} radius={[10, 10, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Notifications Panel */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800">สินค้าต้องเติมสต็อก</h3>
                {unreadAlertCount > 0 ? (
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-lg text-[10px] font-black animate-pulse">
                    {unreadAlertCount} ใหม่
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[10px] font-semibold">
                    {lowStockItems.length} รายการ (อ่านแล้ว)
                  </span>
                )}
              </div>
              {setView && (
                <button 
                  onClick={() => {
                    markAllNotificationsAsRead();
                    setView('products');
                  }}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  จัดการ <ArrowRight size={13} />
                </button>
              )}
           </div>
           
           <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin flex-1">
              {lowStockItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                  <CheckCircle size={48} className="mb-2 opacity-20 text-emerald-500" />
                  <p className="text-sm font-bold text-slate-400">สต็อกสินค้าปกติ</p>
                  <p className="text-xs text-slate-400 mt-1">ทุกรายการมีสต็อกมากกว่า {lowStockThreshold} ชิ้น</p>
                </div>
              ) : (
                lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-red-200 transition-all group">
                     {item.image ? (
                       <img src={item.image} alt={item.name} className="w-11 h-11 rounded-xl object-cover shadow-xs group-hover:scale-105 transition-transform flex-shrink-0" />
                     ) : (
                       <div className="w-11 h-11 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0">
                         <Package size={20} />
                       </div>
                     )}
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                        <p className={`text-xs font-black ${item.stock === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                           {item.stock === 0 ? 'หมดสต็อก (0 ชิ้น)' : `เหลือ ${item.stock} ชิ้น`}
                        </p>
                     </div>
                     {/* Inline Quick Restock Button */}
                     <button
                       onClick={() => handleQuickRestock(item, 10)}
                       className="p-1.5 bg-white border border-slate-200 hover:border-primary-500 hover:bg-primary-50 text-slate-600 hover:text-primary-600 rounded-lg text-xs font-bold transition-all shadow-xs flex-shrink-0"
                       title="เติมสต็อก +10 ชิ้น"
                     >
                       +10
                     </button>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
