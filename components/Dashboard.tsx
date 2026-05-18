
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign, ShoppingBag, AlertTriangle, TrendingUp, Sparkles, Bell, X, CheckCircle, Store, PiggyBank, Briefcase } from 'lucide-react';
import { analyzeSalesData } from '../services/geminiService';

const Dashboard: React.FC = () => {
  const { stats, orders, storeConfig, products, currentThemeColorHex } = useStore();
  const [aiInsight, setAiInsight] = useState<string>("กำลังวิเคราะห์แนวโน้มการขายของคุณ...");
  const [loadingAi, setLoadingAi] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const lowStockItems = products.filter(p => p.stock < storeConfig.lowStockThreshold);

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    const insight = await analyzeSalesData(stats, orders.length, storeConfig.aiApiKey);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  useEffect(() => {
    handleGenerateInsight();
  }, []);

  // Format data for chart
  const last7DaysData = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayOrders = orders.filter(o => o.timestamp.startsWith(dateStr));
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

        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowNotifications(!showNotifications)}
             className="p-3 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 transition-all shadow-sm relative"
           >
             <Bell size={20} />
             {lowStockItems.length > 0 && (
               <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                 {lowStockItems.length}
               </span>
             )}
           </button>
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
            <h3 className={`text-2xl font-black text-slate-800`}>
               {storeConfig.currency}{item.val.toLocaleString()}
            </h3>
          </div>
        ))}
      </div>

      {/* Charts Section */}
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
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">สินค้าต้องเติมสต็อก</h3>
              <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-lg text-[10px] font-black">{lowStockItems.length}</span>
           </div>
           <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
              {lowStockItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                  <CheckCircle size={48} className="mb-2 opacity-20" />
                  <p className="text-sm font-bold">สต็อกสินค้าปกติ</p>
                </div>
              ) : (
                lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-red-200 transition-all group">
                     <img src={item.image} className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                        <p className={`text-xs font-black ${item.stock === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                           เหลือ {item.stock} ชิ้น
                        </p>
                     </div>
                     <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
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
