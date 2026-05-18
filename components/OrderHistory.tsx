
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign, Calendar, FileText, List, Printer, TrendingUp, UserCircle, Trash2, AlertTriangle, X } from 'lucide-react';

const OrderHistory: React.FC = () => {
  const { orders, storeConfig, deleteOrder, currentUser } = useStore();
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'list'>('daily');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const getPaymentLabel = (method: string) => {
    switch(method) {
      case 'cash': return 'เงินสด';
      case 'promptpay': return 'พร้อมเพย์';
      case 'truemoney': return 'TrueMoney';
      case 'transfer': return 'โอนเงิน';
      case 'ewallet': return 'e-Wallet';
      case 'card': return 'บัตรเครดิต';
      default: return method;
    }
  };

  const chartData = useMemo(() => {
    if (viewMode === 'list') return [];
    const dataMap = new Map<string, { date: string; totalSales: number; count: number }>();
    orders.forEach(order => {
      const date = new Date(order.timestamp);
      let key = viewMode === 'daily' ? date.toISOString().split('T')[0] : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      let displayDate = viewMode === 'daily' ? date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      if (!dataMap.has(key)) dataMap.set(key, { date: displayDate, totalSales: 0, count: 0 });
      const entry = dataMap.get(key)!;
      entry.totalSales += order.total;
      entry.count += 1;
    });
    return Array.from(dataMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([key, val]) => val);
  }, [orders, viewMode]);

  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;

  const handleDelete = (id: string) => {
    deleteOrder(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <TrendingUp className="text-blue-600" /> ประวัติการขาย (Sales History)
          </h1>
          <p className="text-slate-500">รายงานยอดขายและรายการสั่งซื้อย้อนหลัง</p>
        </div>

        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
          {['daily', 'monthly', 'list'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === mode ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {mode === 'list' ? <List size={14} /> : <Calendar size={14} />}
              {mode === 'daily' ? 'รายวัน' : mode === 'monthly' ? 'รายเดือน' : 'รายการทั้งหมด'}
            </button>
          ))}
        </div>
      </div>

      {viewMode !== 'list' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-full"><DollarSign size={24} /></div>
              <div><p className="text-sm text-slate-500">ยอดขายรวม</p><h3 className="text-2xl font-bold text-slate-800">{storeConfig.currency}{totalSales.toLocaleString()}</h3></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><FileText size={24} /></div>
              <div><p className="text-sm text-slate-500">จำนวนออเดอร์</p><h3 className="text-2xl font-bold text-slate-800">{totalOrders.toLocaleString()}</h3></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                   <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                   <Bar dataKey="totalSales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">รหัส/วันที่</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">พนักงาน</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">ยอดรวม</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">การชำระ</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <p className="text-xs font-mono text-slate-400">#{order.id.slice(-6)}</p>
                      <p className="text-sm text-slate-700">{new Date(order.timestamp).toLocaleString('th-TH')}</p>
                    </td>
                    <td className="p-4 flex items-center gap-2">
                       <UserCircle size={14} className="text-slate-400" />
                       <span className="text-xs font-medium text-slate-600">{order.cashierName || 'Staff'}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{storeConfig.currency}{order.total.toFixed(2)}</td>
                    <td className="p-4"><span className="uppercase text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{getPaymentLabel(order.paymentMethod)}</span></td>
                    <td className="p-4 text-right">
                       <div className="flex justify-end gap-2">
                         <button onClick={() => window.print()} className="p-2 text-slate-400 hover:text-blue-600"><Printer size={16} /></button>
                         {currentUser?.roleId === 'admin' && (
                           <button onClick={() => setConfirmDeleteId(order.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                         )}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}

      {/* ยืนยันการลบ Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 text-center animate-in zoom-in-95">
             <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={24}/></div>
             <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการลบบิลขาย?</h3>
             <p className="text-sm text-slate-500 mb-6">บิล #{confirmDeleteId.slice(-6)} จะถูกลบออกถาวร และสินค้าจะถูกคืนเข้าสต็อก</p>
             <div className="flex gap-3">
                <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 border border-slate-300 rounded-lg font-bold text-slate-500">ยกเลิก</button>
                <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-200">ยืนยันการลบ</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
