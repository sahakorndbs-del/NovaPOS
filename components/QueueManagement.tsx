
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Clock, CheckCircle, ChefHat, MonitorPlay, Power, Settings as SettingsIcon, X } from 'lucide-react';
import { Order } from '../types';

const QueueManagement: React.FC = () => {
  const { orders, updateOrderStatus, storeConfig, updateConfig } = useStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Use config to determine workflow
  // Default to true if undefined for backward compatibility
  const isReadyStepEnabled = storeConfig.queueStepReadyEnabled ?? true;

  // Filter only active orders (not completed) or recent completed ones
  // For Queue display, we usually show 'preparing' and 'ready'
  const preparingOrders = orders.filter(o => o.status === 'preparing').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const readyOrders = orders.filter(o => o.status === 'ready').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const toggleQueueSystem = () => {
    updateConfig({ ...storeConfig, queueEnabled: !storeConfig.queueEnabled });
  };
  
  const toggleReadyStep = () => {
    updateConfig({ ...storeConfig, queueStepReadyEnabled: !isReadyStepEnabled });
  };

  const getTimeElapsed = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    return `${minutes} นาที`;
  };

  return (
    <div className="p-6 bg-slate-100 h-full overflow-y-auto flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                <MonitorPlay size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-800">สถานะคิวออเดอร์</h1>
                <p className="text-slate-500">จัดการรายการที่กำลังเตรียมและพร้อมเสิร์ฟ</p>
            </div>
        </div>
        
        <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-slate-600 transition-all"
        >
            <SettingsIcon size={18} />
            ตั้งค่าคิว
        </button>
      </div>

      {!storeConfig.queueEnabled ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Power size={64} className="mb-4 opacity-20" />
              <h2 className="text-xl font-bold text-slate-500">ระบบคิวถูกปิดใช้งาน</h2>
              <p className="mb-6">เปิดใช้งานเพื่อเริ่มติดตามสถานะออเดอร์</p>
              <button 
                  onClick={toggleQueueSystem}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold hover:bg-indigo-700 transition-colors shadow-lg"
              >
                  เปิดใช้งานระบบคิว
              </button>
          </div>
      ) : (
          <div className={`flex-1 grid gap-6 h-full overflow-hidden ${isReadyStepEnabled ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Preparing Column */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full">
                <div className="p-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                        <ChefHat size={24}/> กำลังเตรียม (Preparing)
                    </h2>
                    <span className="bg-amber-200 text-amber-900 px-3 py-1 rounded-full text-sm font-bold">
                        {preparingOrders.length}
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {preparingOrders.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-slate-400">ไม่มีรายการค้าง</div>
                    ) : (
                        preparingOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-xl border-l-4 border-amber-400 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-3xl font-bold text-slate-800 mr-2">Q{order.queueNumber}</span>
                                        <span className="text-xs text-slate-500 font-mono">#{order.id.slice(-4)}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                                            <Clock size={12}/> {getTimeElapsed(order.timestamp)}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1 mb-3">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm text-slate-700 border-b border-dashed border-slate-100 pb-1 last:border-0">
                                            <span>{item.quantity}x {item.name}</span>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => updateOrderStatus(order.id, isReadyStepEnabled ? 'ready' : 'completed')}
                                    className={`w-full font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2
                                        ${isReadyStepEnabled 
                                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-800' 
                                            : 'bg-green-100 hover:bg-green-200 text-green-800'
                                        }`}
                                >
                                    <CheckCircle size={18} /> 
                                    {isReadyStepEnabled ? 'แจ้งพร้อมเสิร์ฟ' : 'จบรายการ (เสร็จสิ้น)'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Ready Column - Only show if enabled */}
            {isReadyStepEnabled && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full">
                    <div className="p-4 bg-green-50 border-b border-green-100 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-green-800 flex items-center gap-2">
                            <CheckCircle size={24}/> พร้อมเสิร์ฟ (Ready)
                        </h2>
                        <span className="bg-green-200 text-green-900 px-3 py-1 rounded-full text-sm font-bold">
                            {readyOrders.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                        {readyOrders.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-slate-400">ไม่มีรายการรอรับ</div>
                        ) : (
                            readyOrders.map(order => (
                                <div key={order.id} className="bg-white p-4 rounded-xl border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow opacity-90">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-3xl font-bold text-green-700 mr-2">Q{order.queueNumber}</span>
                                            <span className="text-xs text-slate-500 font-mono">#{order.id.slice(-4)}</span>
                                        </div>
                                        <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                            รอรับสินค้า
                                        </div>
                                    </div>
                                    <div className="space-y-1 mb-3 opacity-60">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="text-sm text-slate-700">
                                                {item.quantity}x {item.name}
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => updateOrderStatus(order.id, 'completed')}
                                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg transition-colors text-sm"
                                    >
                                        จบรายการ (รับแล้ว)
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
          </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <SettingsIcon size={20} /> ตั้งค่าระบบคิว
                    </h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                            <span className="font-bold text-slate-700 block">เปิดใช้งานระบบคิว</span>
                            <span className="text-xs text-slate-500">พิมพ์เลขคิวลงใบเสร็จและแสดงหน้านี้</span>
                        </div>
                        <button 
                            onClick={toggleQueueSystem}
                            className={`w-12 h-6 rounded-full transition-colors relative ${storeConfig.queueEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${storeConfig.queueEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className={`flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 transition-opacity ${!storeConfig.queueEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div>
                            <span className="font-bold text-slate-700 block">ขั้นตอน "พร้อมเสิร์ฟ" (Ready)</span>
                            <span className="text-xs text-slate-500">มีสถานะรอรับสินค้าก่อนจบรายการ</span>
                        </div>
                        <button 
                            onClick={toggleReadyStep}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isReadyStepEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                        >
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${isReadyStepEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                    <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 font-medium text-sm hover:text-slate-800">
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default QueueManagement;
