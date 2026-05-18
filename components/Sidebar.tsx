
import React from 'react';
import { ViewState } from '../types';
import { useStore } from '../context/StoreContext';
import { LayoutDashboard, ShoppingCart, Package, History, Settings, LogOut, Users, MonitorPlay, Percent, UserCircle, FileSpreadsheet, RefreshCw, Database, Cloud, CloudOff } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const { logout, currentUser, roles, isSyncing, pullFromCloud, storeConfig } = useStore();

  const allMenuItems = [
    { id: 'dashboard', label: 'ภาพรวมร้านค้า', icon: LayoutDashboard },
    { id: 'pos', label: 'จุดขาย (POS)', icon: ShoppingCart },
    { id: 'queue', label: 'สถานะคิว', icon: MonitorPlay },
    { id: 'orders', label: 'ประวัติการขาย', icon: History },
    { id: 'sales-report', label: 'รายงานการขาย', icon: FileSpreadsheet },
    { id: 'members', label: 'สมาชิกลูกค้า', icon: Users },
    { id: 'products', label: 'จัดการสินค้า', icon: Package },
    { id: 'discounts', label: 'ประวัติส่วนลด', icon: Percent },
    { id: 'settings', label: 'ตั้งค่าร้านค้า', icon: Settings },
  ] as const;

  const userRole = roles.find(r => r.id === currentUser?.roleId);
  const permissions = userRole?.permissions || ['dashboard', 'pos', 'queue', 'orders', 'sales-report', 'members', 'products', 'discounts', 'settings'];
  const allowedMenuItems = allMenuItems.filter(item => permissions.includes(item.id as ViewState));

  return (
    <aside className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col h-full transition-all duration-300 z-20 shadow-2xl">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between h-16 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary-900/50">N</div>
          <span className="font-bold text-lg tracking-tight hidden lg:block">NovaPOS</span>
        </div>
        
        {storeConfig.googleSheetsUrl && (
          <button 
            onClick={pullFromCloud} 
            disabled={isSyncing}
            className={`p-1.5 rounded-full transition-all ${isSyncing ? 'text-primary-400 animate-spin bg-primary-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
            title="ซิงค์ข้อมูล Cloud"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-slate-800 hidden lg:flex items-center gap-3 bg-slate-900/50">
         <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-primary-500 shadow-inner">
            <UserCircle size={24} />
         </div>
         <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{currentUser?.name || 'พนักงาน'}</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{userRole?.name || 'Staff'}</p>
         </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4 space-y-1.5 px-3 overflow-y-auto scrollbar-hide">
        {allowedMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`w-full flex items-center p-3 rounded-xl transition-all group relative
                ${isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <Icon size={20} className={isActive ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
              <span className="ml-3 font-semibold text-sm hidden lg:block">{item.label}</span>
              {isActive && <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full hidden lg:block"></div>}
            </button>
          );
        })}
      </nav>

      {/* Cloud Status Footer */}
      <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-800">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${storeConfig.googleSheetsUrl ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${storeConfig.googleSheetsUrl ? 'text-emerald-500' : 'text-slate-500'}`}>
                      {storeConfig.googleSheetsUrl ? 'Cloud Online' : 'Offline Mode'}
                  </span>
              </div>
              {storeConfig.googleSheetsUrl ? <Cloud size={12} className="text-emerald-500/50" /> : <CloudOff size={12} className="text-slate-600" />}
          </div>
          {isSyncing && (
              <div className="mt-2 flex items-center gap-2 text-primary-400 text-[10px] font-bold animate-pulse">
                  <Database size={10} />
                  <span>กำลังดึงข้อมูลล่าสุด...</span>
              </div>
          )}
      </div>

      {/* Logout Action */}
      <div className="p-4 border-t border-slate-800">
        <button onClick={logout} className="w-full flex items-center p-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold text-sm">
          <LogOut size={20} />
          <span className="ml-3 hidden lg:block">ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
