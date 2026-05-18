
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { FileSpreadsheet, Download, Calendar, Filter, Search, TrendingUp, DollarSign, Wallet, PiggyBank } from 'lucide-react';

interface ReportItem {
  id: string;
  name: string;
  quantity: number;
  costPrice: number;
  salePrice: number;
  totalRevenue: number;
  totalCost: number; // ราคาสินค้ารวม (ทุน * จำนวน)
  profitPerUnit: number;
  totalProfit: number;
}

const SalesReport: React.FC = () => {
  const { orders, storeConfig } = useStore();
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filter orders based on selected period
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = order.timestamp.split('T')[0];
      const orderMonth = order.timestamp.slice(0, 7);
      
      if (viewMode === 'daily') {
        return orderDate === selectedDate;
      } else {
        return orderMonth === selectedMonth;
      }
    });
  }, [orders, viewMode, selectedDate, selectedMonth]);

  // 2. Aggregate items from filtered orders
  const reportData = useMemo(() => {
    const itemMap = new Map<string, ReportItem>();

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const existing = itemMap.get(item.id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.totalRevenue += item.price * item.quantity;
          existing.totalCost += item.costPrice * item.quantity;
          existing.totalProfit += (item.price - item.costPrice) * item.quantity;
        } else {
          itemMap.set(item.id, {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            costPrice: item.costPrice,
            salePrice: item.price,
            totalRevenue: item.price * item.quantity,
            totalCost: item.costPrice * item.quantity,
            profitPerUnit: item.price - item.costPrice,
            totalProfit: (item.price - item.costPrice) * item.quantity
          });
        }
      });
    });

    let results = Array.from(itemMap.values());
    
    // Apply search filter
    if (searchQuery) {
      results = results.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return results;
  }, [filteredOrders, searchQuery]);

  // 3. Totals for summary
  const totals = useMemo(() => {
    return reportData.reduce((acc, item) => ({
      quantity: acc.quantity + item.quantity,
      revenue: acc.revenue + item.totalRevenue,
      cost: acc.cost + item.totalCost, // เพิ่มยอดต้นทุนรวม
      profit: acc.profit + item.totalProfit
    }), { quantity: 0, revenue: 0, cost: 0, profit: 0 });
  }, [reportData]);

  // 4. Excel Export Function (CSV Format)
  const handleExportExcel = () => {
    const headers = [
      'ลำดับที่',
      'รายการสินค้า',
      'จำนวนหน่วย',
      'ราคาสินค้ารวม (ทุน)',
      'ราคาทุน (ต่อชิ้น)',
      'ราคาขาย (ต่อชิ้น)',
      'กำไร (ต่อชิ้น)',
      'กำไรรวม'
    ];

    // ข้อมูลสินค้า
    const rows = reportData.map((item, index) => [
      index + 1,
      item.name,
      item.quantity,
      item.totalCost.toFixed(2),
      item.costPrice.toFixed(2),
      item.salePrice.toFixed(2),
      item.profitPerUnit.toFixed(2),
      item.totalProfit.toFixed(2)
    ]);

    // เพิ่มแถวรวมสุทธิที่ท้ายไฟล์
    const summaryRow = [
      '',
      'รวมสุทธิ',
      totals.quantity,
      totals.cost.toFixed(2),
      '',
      '',
      '',
      totals.profit.toFixed(2)
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      summaryRow.join(',')
    ].join('\n');

    // Add BOM for Excel Thai characters support
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fileName = `Sales_Report_${viewMode === 'daily' ? selectedDate : selectedMonth}.csv`;
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="text-primary-600" /> รายงานสรุปการขายรายวัน/รายเดือน
          </h1>
          <p className="text-slate-500">วิเคราะห์กำไรและยอดขายรายสินค้าอย่างละเอียด</p>
        </div>

        <button 
          onClick={handleExportExcel}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95"
        >
          <Download size={20} /> Export Excel (.csv)
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('daily')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'daily' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              รายวัน
            </button>
            <button 
              onClick={() => setViewMode('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'monthly' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              รายเดือน
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-slate-400" />
            {viewMode === 'daily' ? (
              <input 
                type="date" 
                className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            ) : (
              <input 
                type="month" 
                className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            )}
          </div>

          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ค้นหาตามชื่อสินค้า..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">ยอดขายรวมสุทธิ</p>
            <h3 className="text-2xl font-bold text-slate-800">{storeConfig.currency}{totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
        
        {/* เพิ่มส่วนสรุปต้นทุนรวม */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
            <PiggyBank size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">ต้นทุนรวม</p>
            <h3 className="text-2xl font-bold text-slate-800">{storeConfig.currency}{totals.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">กำไรรวม</p>
            <h3 className="text-2xl font-bold text-emerald-600">{storeConfig.currency}{totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">จำนวนหน่วยขายรวม</p>
            <h3 className="text-2xl font-bold text-slate-800">{totals.quantity.toLocaleString()} <span className="text-sm font-normal text-slate-400">ชิ้น</span></h3>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">ลำดับ</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">รายการสินค้า</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">จำนวนหน่วย</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">ราคาสินค้ารวม</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">ราคาทุน</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">ราคาขาย</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">กำไร/ชิ้น</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">กำไรรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-slate-400 flex flex-col items-center">
                    <FileSpreadsheet size={48} className="opacity-10 mb-4" />
                    <p className="font-bold">ไม่พบข้อมูลการขายสำหรับช่วงเวลานี้</p>
                  </td>
                </tr>
              ) : (
                reportData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-500 text-center">{index + 1}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{item.name}</p>
                    </td>
                    <td className="p-4 text-sm text-slate-700 text-center font-medium">{item.quantity}</td>
                    <td className="p-4 text-sm text-slate-600 text-right font-medium">
                      {storeConfig.currency}{item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-sm text-slate-500 text-right">{storeConfig.currency}{item.costPrice.toFixed(2)}</td>
                    <td className="p-4 text-sm text-primary-600 font-bold text-right">{storeConfig.currency}{item.salePrice.toFixed(2)}</td>
                    <td className="p-4 text-sm text-right">
                      <span className={`font-bold ${item.profitPerUnit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {storeConfig.currency}{item.profitPerUnit.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-black ${item.totalProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {storeConfig.currency}{item.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {reportData.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr className="font-black">
                  <td colSpan={2} className="p-4 text-slate-800 text-right">รวมสุทธิ</td>
                  <td className="p-4 text-center text-slate-800">{totals.quantity}</td>
                  <td className="p-4 text-right">{storeConfig.currency}{totals.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td colSpan={3} className="p-4"></td>
                  <td className="p-4 text-right text-emerald-600">{storeConfig.currency}{totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesReport;
