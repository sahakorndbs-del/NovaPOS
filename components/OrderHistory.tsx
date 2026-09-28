import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  DollarSign, 
  Calendar, 
  FileText, 
  List, 
  Printer, 
  TrendingUp, 
  UserCircle, 
  Trash2, 
  AlertTriangle, 
  X, 
  Search, 
  Filter, 
  Eye, 
  ShoppingBag, 
  CreditCard, 
  CheckCircle2, 
  Hash, 
  ChevronRight,
  ReceiptText,
  Clock
} from 'lucide-react';
import { Order } from '../types';
import { getLocalDateString, getLocalMonthString, formatThaiDate, formatThaiTime } from '../lib/dateUtils';

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

const OrderHistory: React.FC = () => {
  const { orders, storeConfig, deleteOrder, currentUser } = useStore();
  
  // Date & Period Filter State (defaults to 'today')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today');
  const [customDate, setCustomDate] = useState<string>(() => getLocalDateString(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'chart' | 'both'>('list');
  
  // Modal states
  const [selectedOrderForView, setSelectedOrderForView] = useState<Order | null>(null);
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

  const getPaymentBadgeColor = (method: string) => {
    switch(method) {
      case 'cash': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'promptpay': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'truemoney': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'transfer': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'card': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Filter orders based on active period and filters
  const filteredOrders = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = getLocalDateString(sevenDaysAgo);
    
    const currentMonthStr = getLocalMonthString(new Date());

    return orders.filter(order => {
      const orderDateStr = getLocalDateString(order.timestamp);
      const orderMonthStr = getLocalMonthString(order.timestamp);
      
      // Period filter
      if (periodFilter === 'today') {
        if (orderDateStr !== todayStr) return false;
      } else if (periodFilter === 'yesterday') {
        if (orderDateStr !== yesterdayStr) return false;
      } else if (periodFilter === 'week') {
        if (orderDateStr < sevenDaysAgoStr || orderDateStr > todayStr) return false;
      } else if (periodFilter === 'month') {
        if (orderMonthStr !== currentMonthStr) return false;
      } else if (periodFilter === 'custom') {
        if (orderDateStr !== customDate) return false;
      } // 'all' shows all orders

      // Payment filter
      if (paymentFilter !== 'all' && order.paymentMethod !== paymentFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = order.id.toLowerCase().includes(q);
        const matchCashier = order.cashierName?.toLowerCase().includes(q);
        const matchQueue = String(order.queueNumber ?? '').includes(q);
        const matchItems = order.items?.some(it => it.name.toLowerCase().includes(q));
        if (!matchId && !matchCashier && !matchQueue && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, periodFilter, customDate, paymentFilter, searchQuery]);

  // Summary Metrics for the currently filtered orders
  const periodTotalSales = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.total, 0);
  }, [filteredOrders]);

  const periodOrderCount = filteredOrders.length;

  const averagePerOrder = periodOrderCount > 0 ? periodTotalSales / periodOrderCount : 0;

  // Chart data for daily / monthly breakdown of filtered or period orders
  const chartData = useMemo(() => {
    const dataMap = new Map<string, { date: string; totalSales: number; count: number }>();
    
    // In 'today' or 'yesterday' mode, chart can show hourly distribution
    if (periodFilter === 'today' || periodFilter === 'yesterday' || periodFilter === 'custom') {
      filteredOrders.forEach(order => {
        const d = new Date(order.timestamp);
        const hour = `${String(d.getHours()).padStart(2, '0')}:00`;
        if (!dataMap.has(hour)) {
          dataMap.set(hour, { date: hour, totalSales: 0, count: 0 });
        }
        const entry = dataMap.get(hour)!;
        entry.totalSales += order.total;
        entry.count += 1;
      });
      return Array.from(dataMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([, val]) => val);
    }

    // In 'week', 'month', 'all' mode, group by day
    filteredOrders.forEach(order => {
      const dateKey = getLocalDateString(order.timestamp);
      const displayDate = new Date(order.timestamp).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, { date: displayDate, totalSales: 0, count: 0 });
      }
      const entry = dataMap.get(dateKey)!;
      entry.totalSales += order.total;
      entry.count += 1;
    });

    return Array.from(dataMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([, val]) => val);
  }, [filteredOrders, periodFilter]);

  const handleDelete = (id: string) => {
    deleteOrder(id);
    setConfirmDeleteId(null);
    if (selectedOrderForView?.id === id) {
      setSelectedOrderForView(null);
    }
  };

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'today': return 'วันนี้';
      case 'yesterday': return 'เมื่อวาน';
      case 'week': return '7 วันล่าสุด';
      case 'month': return 'เดือนนี้';
      case 'custom': return `วันที่ ${formatThaiDate(customDate)}`;
      case 'all': return 'รายการทั้งหมด';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                ประวัติการขาย (Sales History)
              </h1>
              <p className="text-sm text-slate-500">
                แสดงยอดขายและออเดอร์ • ปัจจุบันเลือก: <span className="font-semibold text-blue-600">{getPeriodLabel()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List size={15} /> ตารางรายการ
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'chart' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TrendingUp size={15} /> กราฟสรุป
          </button>
          <button
            onClick={() => setViewMode('both')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'both' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar size={15} /> ทั้งหมด
          </button>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setPeriodFilter('today')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              periodFilter === 'today'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            วันนี้ (Today)
          </button>
          <button
            onClick={() => setPeriodFilter('yesterday')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              periodFilter === 'yesterday'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            เมื่อวาน
          </button>
          <button
            onClick={() => setPeriodFilter('week')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              periodFilter === 'week'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            7 วันล่าสุด
          </button>
          <button
            onClick={() => setPeriodFilter('month')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              periodFilter === 'month'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            เดือนนี้
          </button>
          <button
            onClick={() => setPeriodFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              periodFilter === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ทั้งหมด ({orders.length})
          </button>
        </div>

        {/* Custom Date Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Calendar size={14} /> เลือกวันที่:
          </span>
          <input
            type="date"
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setPeriodFilter('custom');
            }}
            className={`text-sm px-3 py-1.5 rounded-xl border transition-all ${
              periodFilter === 'custom'
                ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-bold ring-2 ring-blue-100'
                : 'border-slate-300 bg-white text-slate-700'
            }`}
          />
        </div>
      </div>

      {/* Summary KPI Cards for the selected period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              ยอดขาย ({getPeriodLabel()})
            </p>
            <h3 className="text-2xl font-black text-slate-800">
              {storeConfig.currency}{periodTotalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              จำนวนออเดอร์ ({getPeriodLabel()})
            </p>
            <h3 className="text-2xl font-black text-blue-600">
              {periodOrderCount.toLocaleString()} <span className="text-sm font-semibold text-slate-500">ออเดอร์</span>
            </h3>
          </div>
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
            <FileText size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              ยอดเฉลี่ยต่อบิล
            </p>
            <h3 className="text-2xl font-black text-slate-800">
              {storeConfig.currency}{averagePerOrder.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
            <ShoppingBag size={24} />
          </div>
        </div>
      </div>

      {/* Chart Section (if chart or both view selected) */}
      {(viewMode === 'chart' || viewMode === 'both') && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" />
                กราฟสรุปยอดขาย ({getPeriodLabel()})
              </h3>
              <p className="text-xs text-slate-500">
                {periodFilter === 'today' || periodFilter === 'yesterday' || periodFilter === 'custom' 
                  ? 'แสดงยอดขายแยกตามช่วงเวลา (ชั่วโมง)' 
                  : 'แสดงยอดขายแยกตามวัน'}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {chartData.length} จุดข้อมูล
            </span>
          </div>

          <div className="h-64 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                ไม่มีข้อมูลยอดขายในช่วงเวลานี้
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' 
                    }}
                    formatter={(v: any) => [`${Number(v).toLocaleString()} ${storeConfig.currency}`, 'ยอดขาย']}
                  />
                  <Bar dataKey="totalSales" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      {(viewMode === 'list' || viewMode === 'both') && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหาเลขบิล, ชื่อพนักงาน, เลขคิว, หรือสินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Payment filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap flex items-center gap-1">
              <CreditCard size={14} /> วิธีชำระ:
            </span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">ทั้งหมด</option>
              <option value="cash">เงินสด</option>
              <option value="promptpay">พร้อมเพย์</option>
              <option value="truemoney">TrueMoney</option>
              <option value="transfer">โอนเงิน</option>
              <option value="card">บัตรเครดิต</option>
            </select>
          </div>
        </div>
      )}

      {/* Orders Table Section */}
      {(viewMode === 'list' || viewMode === 'both') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ReceiptText size={18} className="text-blue-600" />
              <span className="font-bold text-sm text-slate-800">
                รายการบิลขาย ({filteredOrders.length} รายการ)
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              แสดงเฉพาะรายการ: <span className="font-bold text-slate-700">{getPeriodLabel()}</span>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-700">ไม่พบบิลการขายใน{getPeriodLabel()}</p>
              <p className="text-sm text-slate-400 mt-1">
                {periodFilter === 'today'
                  ? 'ยังไม่มีการสั่งซื้อสำหรับวันนี้ หรือลองเลือกตัวเลือก "ทั้งหมด" เพื่อดูย้อนหลัง'
                  : 'ลองเปลี่ยนคำค้นหาหรือเลือกช่วงเวลาอื่น'}
              </p>
              {periodFilter !== 'all' && (
                <button
                  onClick={() => setPeriodFilter('all')}
                  className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors"
                >
                  ดูรายการขายทั้งหมด ({orders.length} รายการ)
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">รหัสบิล / เวลา</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">คิว</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">รายการสินค้า</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">พนักงาน</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">ยอดสุทธิ</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">การชำระ</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const itemCount = order.items?.reduce((s, it) => s + it.quantity, 0) || 0;
                    return (
                      <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group">
                        {/* Order ID & Time */}
                        <td className="p-4">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            #{order.id.slice(-6)}
                          </span>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" />
                            {formatThaiDate(order.timestamp, true)}
                          </p>
                        </td>

                        {/* Queue Number */}
                        <td className="p-4">
                          {order.queueNumber ? (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100">
                              <Hash size={12} />
                              {order.queueNumber}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        {/* Items Preview */}
                        <td className="p-4">
                          <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                            {order.items?.map(it => `${it.name} x${it.quantity}`).join(', ') || 'ไม่มีรายการ'}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            รวม {itemCount} ชิ้น
                          </span>
                        </td>

                        {/* Cashier */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <UserCircle size={14} className="text-slate-400" />
                            <span className="text-xs font-medium text-slate-600">
                              {order.cashierName || 'Staff'}
                            </span>
                          </div>
                        </td>

                        {/* Total */}
                        <td className="p-4">
                          <span className="font-bold text-sm text-slate-900">
                            {storeConfig.currency}{order.total.toFixed(2)}
                          </span>
                          {order.discount > 0 && (
                            <span className="block text-[10px] text-red-500">
                              ลด {storeConfig.currency}{order.discount.toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Payment Method */}
                        <td className="p-4">
                          <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg border ${getPaymentBadgeColor(order.paymentMethod)}`}>
                            {getPaymentLabel(order.paymentMethod)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center gap-1">
                            {/* View details */}
                            <button
                              onClick={() => setSelectedOrderForView(order)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="ดูรายละเอียดบิล"
                            >
                              <Eye size={16} />
                            </button>

                            {/* Print receipt */}
                            <button
                              onClick={() => {
                                setSelectedOrderForView(order);
                                setTimeout(() => window.print(), 200);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="พิมพ์ใบเสร็จ"
                            >
                              <Printer size={16} />
                            </button>

                            {/* Delete (Admin only) */}
                            {(currentUser?.isAdmin || currentUser?.roleId === 'admin') && (
                              <button
                                onClick={() => setConfirmDeleteId(order.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="ลบบิลขาย"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Order Detail & Receipt Modal */}
      {selectedOrderForView && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <ReceiptText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    รายละเอียดบิล #{selectedOrderForView.id.slice(-6)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatThaiDate(selectedOrderForView.timestamp, true)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForView(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Receipt Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Store & Order Header */}
              <div className="text-center pb-4 border-b border-dashed border-slate-200">
                <h4 className="font-bold text-lg text-slate-800">{storeConfig.name}</h4>
                <p className="text-xs text-slate-500">{storeConfig.address}</p>
                {selectedOrderForView.queueNumber && (
                  <div className="mt-3 inline-block bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-1 rounded-full font-mono font-bold text-sm">
                    คิว #{selectedOrderForView.queueNumber}
                  </div>
                )}
              </div>

              {/* Order Meta info */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">พนักงานขาย: </span>
                  <span className="font-semibold">{selectedOrderForView.cashierName || 'Staff'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">วิธีชำระ: </span>
                  <span className="font-semibold">{getPaymentLabel(selectedOrderForView.paymentMethod)}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 border-t border-b border-dashed border-slate-200 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">รายการสินค้า</p>
                {selectedOrderForView.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs">
                    <div className="flex-1 pr-2">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-slate-400">
                        {item.quantity} x {storeConfig.currency}{item.price.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-bold text-slate-800">
                      {storeConfig.currency}{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Calculation breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>ยอดรวมสินค้า (Subtotal)</span>
                  <span className="font-semibold">
                    {storeConfig.currency}{(selectedOrderForView.subtotal || selectedOrderForView.total).toFixed(2)}
                  </span>
                </div>
                {selectedOrderForView.discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>ส่วนลด (Discount) {selectedOrderForView.couponCode ? `[${selectedOrderForView.couponCode}]` : ''}</span>
                    <span className="font-semibold">
                      -{storeConfig.currency}{selectedOrderForView.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>ยอดสุทธิ (Total)</span>
                  <span className="text-blue-600">
                    {storeConfig.currency}{selectedOrderForView.total.toFixed(2)}
                  </span>
                </div>

                {/* Cash received & change */}
                {selectedOrderForView.paymentMethod === 'cash' && selectedOrderForView.cashReceived !== undefined && (
                  <div className="pt-2 text-xs border-t border-slate-100 space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>รับเงินสดมา</span>
                      <span>{storeConfig.currency}{selectedOrderForView.cashReceived.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>เงินทอน</span>
                      <span className="font-bold text-slate-800">
                        {storeConfig.currency}{(selectedOrderForView.change ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setSelectedOrderForView(null)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ปิด
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={16} /> พิมพ์ใบเสร็จ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการลบบิลขาย?</h3>
            <p className="text-sm text-slate-500 mb-6">
              บิล #{confirmDeleteId.slice(-6)} จะถูกลบออกถาวร และสต็อกสินค้าจะถูกคืนเข้าระบบ
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
