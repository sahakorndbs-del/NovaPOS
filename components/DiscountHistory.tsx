
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Percent, Calendar, FileText, List, Tag } from 'lucide-react';

const DiscountHistory: React.FC = () => {
  const { orders, storeConfig } = useStore();
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'list'>('daily');

  // Filter orders that have discounts
  const discountedOrders = orders.filter(o => o.discount > 0);

  const chartData = useMemo(() => {
    if (viewMode === 'list') return [];

    const dataMap = new Map<string, { date: string; totalDiscount: number; count: number; couponNames: Set<string> }>();

    discountedOrders.forEach(order => {
      const date = new Date(order.timestamp);
      let key = '';
      let displayDate = '';

      if (viewMode === 'daily') {
        key = date.toISOString().split('T')[0];
        displayDate = date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        displayDate = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      }

      if (!dataMap.has(key)) {
        dataMap.set(key, { date: displayDate, totalDiscount: 0, count: 0, couponNames: new Set() });
      }

      const entry = dataMap.get(key)!;
      entry.totalDiscount += order.discount;
      entry.count += 1;
      if (order.couponCode) entry.couponNames.add(order.couponCode);
    });

    // Convert map to array and sort by date (asc)
    return Array.from(dataMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, val]) => ({
        ...val,
        coupons: Array.from(val.couponNames).join(', ')
      }));

  }, [discountedOrders, viewMode]);

  const totalDiscountAllTime = discountedOrders.reduce((sum, o) => sum + o.discount, 0);

  const getDiscountDetail = (order: any) => {
      const details = [];
      if (order.couponCode) details.push(`คูปอง: ${order.couponCode}`);
      if (order.pointsRedeemed > 0) details.push(`แต้ม: ${order.pointsRedeemed}`);
      // Manual discount check logic if available in order object, currently heuristic based on remaining
      const manual = order.discount - (order.pointsRedeemed ? Math.floor(order.pointsRedeemed/storeConfig.pointRedemptionRate) : 0); 
      // Note: This is an estimation for display if exact manual discount isn't stored separately in history.
      // Ideally Order type should have manualDiscount field.
      
      if (details.length === 0) return 'ส่วนลดทั่วไป';
      return details.join(' + ');
  };

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <Percent className="text-red-500" /> ประวัติการใช้ส่วนลด
          </h1>
          <p className="text-slate-500">ติดตามยอดส่วนลดที่ให้ลูกค้า รายวัน/รายเดือน</p>
        </div>

        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
          <button
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'daily' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Calendar size={14} /> รายวัน
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'monthly' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Calendar size={14} /> รายเดือน
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <List size={14} /> ทั้งหมด
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="p-3 bg-red-100 text-red-600 rounded-full">
              <Percent size={24} />
           </div>
           <div>
              <p className="text-sm text-slate-500">ส่วนลดรวมทั้งหมด</p>
              <h3 className="text-2xl font-bold text-slate-800">{storeConfig.currency}{totalDiscountAllTime.toLocaleString()}</h3>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <FileText size={24} />
           </div>
           <div>
              <p className="text-sm text-slate-500">จำนวนออเดอร์ที่ลด</p>
              <h3 className="text-2xl font-bold text-slate-800">{discountedOrders.length.toLocaleString()}</h3>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <Calendar size={24} />
           </div>
           <div>
              <p className="text-sm text-slate-500">เฉลี่ยส่วนลดต่อบิล</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {storeConfig.currency}{discountedOrders.length > 0 ? (totalDiscountAllTime / discountedOrders.length).toFixed(2) : '0.00'}
              </h3>
           </div>
        </div>
      </div>

      {/* View: Analytics (Daily/Monthly) */}
      {viewMode !== 'list' && (
        <>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
             <h3 className="text-lg font-bold text-slate-800 mb-6">แนวโน้มการให้ส่วนลด ({viewMode === 'daily' ? 'รายวัน' : 'รายเดือน'})</h3>
             <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                         cursor={{fill: '#f8fafc'}}
                         contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                         formatter={(value: number) => [`${value.toLocaleString()} ${storeConfig.currency}`, 'ส่วนลด']}
                      />
                      <Bar dataKey="totalDiscount" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} name="ยอดส่วนลด" />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-700">รายละเอียดตามช่วงเวลา</h3>
             </div>
             <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-100">
                   <tr>
                      <th className="p-4 text-sm font-semibold text-slate-600">ช่วงเวลา</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">จำนวนออเดอร์</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">คูปองที่ใช้</th>
                      <th className="p-4 text-sm font-semibold text-slate-600 text-right">ยอดส่วนลดรวม</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {chartData.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-400">ไม่พบข้อมูลการใช้ส่วนลด</td></tr>
                   ) : (
                      chartData.slice().reverse().map((row, idx) => (
                         <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-4 font-medium text-slate-800">{row.date}</td>
                            <td className="p-4 text-slate-600">{row.count}</td>
                            <td className="p-4 text-sm text-slate-500">
                               {row.coupons ? (
                                  <div className="flex flex-wrap gap-1">
                                     {row.coupons.split(', ').map((c, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs border border-blue-100">{c}</span>
                                     ))}
                                  </div>
                               ) : '-'}
                            </td>
                            <td className="p-4 text-right font-bold text-red-600">
                               {storeConfig.currency}{row.totalDiscount.toLocaleString()}
                            </td>
                         </tr>
                      ))
                   )}
                </tbody>
             </table>
          </div>
        </>
      )}

      {/* View: Transaction List (Raw Data) */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
           <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">รายการส่วนลดทั้งหมด</h3>
              <span className="text-xs text-slate-500">แสดง {discountedOrders.length} รายการ</span>
           </div>
           <table className="w-full text-left">
              <thead className="bg-white border-b border-slate-200">
                <tr>
                  <th className="p-4 text-sm font-semibold text-slate-600">วันที่</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">เลขที่บิล</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">ประเภท</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 text-right">ยอดซื้อ</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 text-right">ส่วนลด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discountedOrders.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">ไม่พบประวัติการใช้ส่วนลด</td></tr>
                ) : (
                  discountedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="p-4 text-sm text-slate-700">
                        {new Date(order.timestamp).toLocaleString('th-TH')}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">#{order.id.slice(-6)}</td>
                      <td className="p-4 text-sm text-slate-700">
                         {order.couponCode && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs border border-blue-100 mr-2">
                               <Tag size={12} /> {order.couponCode}
                            </span>
                         )}
                         {order.pointsRedeemed ? (
                            <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs border border-orange-100">
                               ใช้แต้ม {order.pointsRedeemed}
                            </span>
                         ) : (!order.couponCode && <span className="text-slate-500">Manual</span>)}
                      </td>
                      <td className="p-4 text-right font-medium text-slate-600">{storeConfig.currency}{order.subtotal.toFixed(2)}</td>
                      <td className="p-4 text-right font-bold text-red-600">-{storeConfig.currency}{order.discount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default DiscountHistory;
