
import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { ViewState, Coupon, User, Role } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import ProductManagement from './components/ProductManagement';
import MemberManagement from './components/MemberManagement';
import QueueManagement from './components/QueueManagement';
import DiscountHistory from './components/DiscountHistory';
import OrderHistory from './components/OrderHistory';
import SalesReport from './components/SalesReport';
import Login from './components/Login';
import { Store, Trash2, Plus, TicketPercent, Shield, Link, Users, Settings as SettingsIcon, Edit, X, Save, UserCog, CheckSquare, Square, Lock, Unlock, AlertTriangle, Coins, Stamp, CircleOff, Palette, QrCode, Upload, CreditCard, ToggleLeft, ToggleRight, Banknote, Landmark, Wallet, Calendar, Image as ImageIcon } from 'lucide-react';

const SettingsView: React.FC = () => {
    const { storeConfig, updateConfig, coupons, addCoupon, updateCoupon, deleteCoupon, users, addUser, updateUser, deleteUser, currentUser, roles, addRole, updateRole, deleteRole } = useStore();
    const [localConfig, setLocalConfig] = React.useState(storeConfig);
    const [activeTab, setActiveTab] = useState<'general' | 'payment' | 'members' | 'coupons' | 'connect' | 'admin'>('general');
    
    // Admin Check
    const isCurrentUserAdmin = currentUser?.roleId === 'admin';

    // Generic Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Coupon Form State
    const [newCoupon, setNewCoupon] = useState<Coupon>({
      code: '',
      type: 'amount',
      value: 0,
      description: '',
      startDate: '',
      endDate: '',
      isActive: true
    });

    // User Management State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userFormData, setUserFormData] = useState<User>({
        id: '',
        name: '',
        email: '',
        roleId: 'cashier'
    });
    const [isEditingUser, setIsEditingUser] = useState(false);

    // Role Management State
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [roleFormData, setRoleFormData] = useState<Role>({
        id: '',
        name: '',
        permissions: []
    });
    const [isEditingRole, setIsEditingRole] = useState(false);

    const themeOptions = [
        { id: 'blue', name: 'Blue (Default)', color: '#2563eb' },
        { id: 'purple', name: 'Purple', color: '#7c3aed' },
        { id: 'green', name: 'Green', color: '#059669' },
        { id: 'orange', name: 'Orange', color: '#ea580c' },
        { id: 'rose', name: 'Rose', color: '#e11d48' },
        { id: 'slate', name: 'Slate', color: '#475569' },
    ];

    const handleTabChange = (tabId: typeof activeTab) => {
        setActiveTab(tabId);
    };

    const handleSave = () => {
        updateConfig(localConfig);
        alert("บันทึกการตั้งค่าเรียบร้อย!");
    };

    const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'promptPayQr' | 'trueMoneyQr') => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // Limit 2MB
                alert("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setLocalConfig(prev => ({ ...prev, [type]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // Limit 2MB
                alert("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setLocalConfig(prev => ({ ...prev, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const togglePaymentMethod = (method: keyof typeof localConfig.paymentMethods) => {
        setLocalConfig(prev => ({
            ...prev,
            paymentMethods: {
                ...prev.paymentMethods,
                [method]: !prev.paymentMethods[method]
            }
        }));
    };

    // Helper to open confirmation modal
    const requestDelete = (title: string, message: string, action: () => void) => {
        setDeleteConfirmation({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                action();
                setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleAddCoupon = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCoupon.code || newCoupon.value <= 0) return;
      addCoupon(newCoupon);
      setNewCoupon({ code: '', type: 'amount', value: 0, description: '', startDate: '', endDate: '', isActive: true });
    };

    const handleDeleteCoupon = (code: string) => {
        requestDelete(
            'ยืนยันการลบคูปอง',
            `คุณต้องการลบคูปอง "${code}" หรือไม่?`,
            () => deleteCoupon(code)
        );
    };

    // User Management Handlers
    const openUserModal = (user?: User) => {
        if (user) {
            setUserFormData({ ...user });
            setIsEditingUser(true);
        } else {
            setUserFormData({ id: '', name: '', email: '', roleId: roles[1]?.id || 'cashier' });
            setIsEditingUser(false);
        }
        setIsUserModalOpen(true);
    };

    const handleUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditingUser) {
            updateUser({ ...userFormData });
        } else {
            addUser({ ...userFormData, id: Date.now().toString() });
        }
        setIsUserModalOpen(false);
    };

    const handleDeleteUser = (id: string, name: string) => {
        requestDelete(
            'ยืนยันการลบผู้ใช้',
            `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${name}"?\nผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบได้อีก`,
            () => deleteUser(id)
        );
    };

    // Role Management Handlers
    const openRoleModal = (role?: Role) => {
        if (role) {
            setRoleFormData({ ...role });
            setIsEditingRole(true);
        } else {
            setRoleFormData({ id: '', name: '', permissions: [] });
            setIsEditingRole(false);
        }
        setIsRoleModalOpen(true);
    };

    const handleRoleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditingRole) {
            updateRole({ ...roleFormData });
        } else {
            addRole({ ...roleFormData, id: Date.now().toString() });
        }
        setIsRoleModalOpen(false);
    };

    const handleDeleteRole = (id: string, name: string) => {
        requestDelete(
            'ยืนยันการลบตำแหน่ง',
            `คุณแน่ใจหรือไม่ว่าต้องการลบตำแหน่ง "${name}"?`,
            () => deleteRole(id)
        );
    };

    const togglePermission = (view: ViewState) => {
        setRoleFormData(prev => {
            const hasPermission = prev.permissions.includes(view);
            if (hasPermission) {
                return { ...prev, permissions: prev.permissions.filter(p => p !== view) };
            } else {
                return { ...prev, permissions: [...prev.permissions, view] };
            }
        });
    };

    const tabs = [
      { id: 'general', label: 'ร้านค้าทั่วไป', icon: Store },
      { id: 'payment', label: 'การชำระเงิน', icon: CreditCard },
      { id: 'members', label: 'ระบบสมาชิก', icon: Users },
      { id: 'coupons', label: 'คูปองส่วนลด', icon: TicketPercent },
      { id: 'connect', label: 'เชื่อมต่อระบบ', icon: Link },
      { id: 'admin', label: 'ผู้ดูแลระบบ', icon: Shield },
    ] as const;

    const availablePermissions: {id: ViewState, label: string}[] = [
        { id: 'dashboard', label: 'ภาพรวมร้านค้า (Dashboard)' },
        { id: 'pos', label: 'จุดขาย (POS)' },
        { id: 'queue', label: 'สถานะคิว (Queue)' },
        { id: 'orders', label: 'ประวัติการขาย (Orders)' },
        { id: 'members', label: 'จัดการสมาชิก (Members)' },
        { id: 'products', label: 'จัดการสินค้า (Products)' },
        { id: 'discounts', label: 'ประวัติส่วนลด (Discounts)' },
        { id: 'settings', label: 'ตั้งค่าร้านค้า (Settings)' },
        { id: 'sales-report', label: 'รายงานการขาย (Sales Report)' },
    ];

    const inputClass = "w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-shadow";

    return (
        <div className="p-6 bg-slate-50 h-full overflow-y-auto flex flex-col">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">ตั้งค่าร้านค้า</h1>
            
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm
                      ${isActive 
                        ? 'bg-primary-600 text-white shadow-primary-200' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}
                    `}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <div className="flex-1 w-full max-w-6xl">
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6 animate-fade-in">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">ข้อมูลร้านค้าทั่วไป</h2>
                        
                        {/* Logo Upload Section */}
                        <div className="mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-300 bg-white flex items-center justify-center shadow-sm">
                                    {localConfig.logoUrl ? (
                                        <img src={localConfig.logoUrl} alt="Store Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon size={32} className="text-slate-300" />
                                    )}
                                </div>
                                {localConfig.logoUrl && (
                                    <button 
                                        onClick={() => setLocalConfig({...localConfig, logoUrl: ""})}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                                        title="ลบโลโก้"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="font-bold text-slate-700 mb-1">โลโก้ร้านค้า</h3>
                                <p className="text-xs text-slate-500 mb-3">แสดงในหน้าแรกและใบเสร็จ (แนะนำขนาด 500x500px)</p>
                                <div className="relative inline-block">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors">
                                        <Upload size={16} /> อัปโหลดรูปภาพ
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อร้าน</label>
                                <input type="text" className={inputClass} value={localConfig.name} onChange={(e) => setLocalConfig({...localConfig, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ที่อยู่ร้าน</label>
                                <textarea className={inputClass} value={localConfig.address} onChange={(e) => setLocalConfig({...localConfig, address: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">สกุลเงิน</label>
                                    <input type="text" className={inputClass} value={localConfig.currency} onChange={(e) => setLocalConfig({...localConfig, currency: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">อัตราภาษี (%)</label>
                                    <input type="number" className={inputClass} value={localConfig.taxRate} onChange={(e) => setLocalConfig({...localConfig, taxRate: parseFloat(e.target.value)})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">แจ้งเตือนสินค้าใกล้หมดเมื่อต่ำกว่า (ชิ้น)</label>
                                <input 
                                type="number" 
                                className={inputClass} 
                                value={localConfig.lowStockThreshold} 
                                onChange={(e) => setLocalConfig({...localConfig, lowStockThreshold: parseInt(e.target.value) || 0})} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Theme Customization */}
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                            <Palette size={20} className="text-primary-600"/> ธีมสีของแอป
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {themeOptions.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => setLocalConfig({...localConfig, themeColor: theme.id})}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                                        localConfig.themeColor === theme.id 
                                        ? 'border-primary-500 bg-primary-50' 
                                        : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div 
                                        className="w-8 h-8 rounded-full shadow-sm" 
                                        style={{ backgroundColor: theme.color }}
                                    ></div>
                                    <span className={`font-medium ${localConfig.themeColor === theme.id ? 'text-primary-700' : 'text-slate-600'}`}>
                                        {theme.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
              )}

              {/* Payment Settings */}
              {activeTab === 'payment' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6 animate-fade-in">
                    
                    {/* Payment Methods Toggle */}
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                            <CheckSquare size={20} className="text-green-600"/> เปิด/ปิด ช่องทางการชำระเงิน
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { id: 'cash', label: 'เงินสด', icon: Banknote },
                                { id: 'promptpay', label: 'พร้อมเพย์', icon: QrCode },
                                { id: 'truemoney', label: 'TrueMoney', icon: Wallet },
                                { id: 'transfer', label: 'โอนเงิน', icon: Landmark },
                                { id: 'ewallet', label: 'e-Wallet', icon: Wallet },
                                { id: 'card', label: 'บัตรเครดิต', icon: CreditCard },
                            ].map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => togglePaymentMethod(method.id as any)}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                        localConfig.paymentMethods[method.id as keyof typeof localConfig.paymentMethods]
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-slate-200 bg-white text-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <method.icon size={20} />
                                        <span className="font-bold">{method.label}</span>
                                    </div>
                                    {localConfig.paymentMethods[method.id as keyof typeof localConfig.paymentMethods] 
                                        ? <ToggleRight size={28} className="text-primary-600"/> 
                                        : <ToggleLeft size={28} className="text-slate-300"/>
                                    }
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bank Account Settings */}
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                            <CreditCard size={20} className="text-blue-600"/> ตั้งค่าบัญชีธนาคาร (สำหรับโอนเงิน)
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อธนาคาร</label>
                                <input 
                                    type="text" 
                                    placeholder="เช่น กสิกรไทย, ไทยพาณิชย์"
                                    className={inputClass} 
                                    value={localConfig.bankName || ''} 
                                    onChange={(e) => setLocalConfig({...localConfig, bankName: e.target.value})} 
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เลขที่บัญชี</label>
                                    <input 
                                        type="text" 
                                        placeholder="xxx-x-xxxxx-x"
                                        className={inputClass} 
                                        value={localConfig.bankAccount || ''} 
                                        onChange={(e) => setLocalConfig({...localConfig, bankAccount: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อบัญชี</label>
                                    <input 
                                        type="text" 
                                        placeholder="ชื่อ-นามสกุล"
                                        className={inputClass} 
                                        value={localConfig.bankAccountName || ''} 
                                        onChange={(e) => setLocalConfig({...localConfig, bankAccountName: e.target.value})} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* QR Code Settings */}
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                            <QrCode size={20} className="text-primary-600"/> ตั้งค่า QR Code (สำหรับสแกนจ่าย)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* PromptPay Upload */}
                            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                                <div className="mb-3 text-center">
                                    <h3 className="font-bold text-slate-700">QR Code พร้อมเพย์</h3>
                                    <p className="text-xs text-slate-500">สำหรับรับโอนเงิน PromptPay</p>
                                </div>
                                {localConfig.promptPayQr ? (
                                    <div className="relative w-full aspect-square mb-3 bg-white rounded-lg overflow-hidden border border-slate-200">
                                        <img src={localConfig.promptPayQr} alt="PromptPay QR" className="w-full h-full object-contain" />
                                        <button 
                                            onClick={() => setLocalConfig({...localConfig, promptPayQr: ""})}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-full aspect-square mb-3 bg-white border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400">
                                        <QrCode size={48} className="mb-2 opacity-50" />
                                        <span className="text-xs">ยังไม่มีรูป QR</span>
                                    </div>
                                )}
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => handleQrUpload(e, 'promptPayQr')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <button className="w-full bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-100">
                                        <Upload size={16} /> อัปโหลดรูป
                                    </button>
                                </div>
                            </div>

                            {/* TrueMoney Upload */}
                            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                                <div className="mb-3 text-center">
                                    <h3 className="font-bold text-orange-600">QR Code TrueMoney</h3>
                                    <p className="text-xs text-slate-500">สำหรับรับเงิน TrueMoney Wallet</p>
                                </div>
                                {localConfig.trueMoneyQr ? (
                                    <div className="relative w-full aspect-square mb-3 bg-white rounded-lg overflow-hidden border border-slate-200">
                                        <img src={localConfig.trueMoneyQr} alt="TrueMoney QR" className="w-full h-full object-contain" />
                                        <button 
                                            onClick={() => setLocalConfig({...localConfig, trueMoneyQr: ""})}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-full aspect-square mb-3 bg-white border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400">
                                        <QrCode size={48} className="mb-2 opacity-50" />
                                        <span className="text-xs">ยังไม่มีรูป QR</span>
                                    </div>
                                )}
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => handleQrUpload(e, 'trueMoneyQr')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <button className="w-full bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-100">
                                        <Upload size={16} /> อัปโหลดรูป
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {/* Member Settings */}
              {activeTab === 'members' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-fade-in space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">ตั้งค่าระบบสมาชิก</h2>
                    
                    {/* Loyalty System Selector */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">เลือกรูปแบบระบบสมาชิก</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <button
                                onClick={() => setLocalConfig({...localConfig, loyaltySystem: 'points'})}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${localConfig.loyaltySystem === 'points' ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200 ring-offset-2' : 'border-slate-200 hover:border-orange-200'}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-2 rounded-full ${localConfig.loyaltySystem === 'points' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}><Coins size={20}/></div>
                                    <span className={`font-bold ${localConfig.loyaltySystem === 'points' ? 'text-orange-700' : 'text-slate-600'}`}>สะสมแต้ม</span>
                                </div>
                                <p className="text-xs text-slate-500">คำนวณจากยอดซื้อ (เช่น 25 บาท = 1 แต้ม) เหมาะสำหรับร้านที่เน้นมูลค่าการซื้อ</p>
                            </button>

                            <button
                                onClick={() => setLocalConfig({...localConfig, loyaltySystem: 'stamps'})}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${localConfig.loyaltySystem === 'stamps' ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200 ring-offset-2' : 'border-slate-200 hover:border-purple-200'}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-2 rounded-full ${localConfig.loyaltySystem === 'stamps' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}><Stamp size={20}/></div>
                                    <span className={`font-bold ${localConfig.loyaltySystem === 'stamps' ? 'text-purple-700' : 'text-slate-600'}`}>สะสมดวงตรา</span>
                                </div>
                                <p className="text-xs text-slate-500">นับตามจำนวนครั้งที่มา (เมื่อยอดถึงกำหนด) เหมาะสำหรับร้านกาแฟ/บริการ</p>
                            </button>

                            <button
                                onClick={() => setLocalConfig({...localConfig, loyaltySystem: 'none'})}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${localConfig.loyaltySystem === 'none' ? 'border-slate-500 bg-slate-50 ring-2 ring-slate-200 ring-offset-2' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-2 rounded-full ${localConfig.loyaltySystem === 'none' ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-500'}`}><CircleOff size={20}/></div>
                                    <span className={`font-bold ${localConfig.loyaltySystem === 'none' ? 'text-slate-800' : 'text-slate-600'}`}>ปิดระบบ</span>
                                </div>
                                <p className="text-xs text-slate-500">ไม่ใช้งานระบบสมาชิก</p>
                            </button>
                        </div>
                    </div>

                    {/* Points Config */}
                    {localConfig.loyaltySystem === 'points' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                            <label className="block text-sm font-bold text-orange-900 mb-2">การให้แต้ม (Earn)</label>
                            <label className="block text-xs text-orange-600 mb-1">ยอดซื้อทุกๆ (บาท)</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border border-orange-200 bg-white text-orange-900 rounded-lg mb-1 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                value={localConfig.pointEarningRate} 
                                onChange={(e) => setLocalConfig({...localConfig, pointEarningRate: parseFloat(e.target.value) || 0})}
                                />
                            <p className="text-xs text-orange-500">= ได้รับ 1 แต้ม</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <label className="block text-sm font-bold text-blue-900 mb-2">การใช้แต้ม (Redeem)</label>
                            <label className="block text-xs text-blue-600 mb-1">ใช้แต้มจำนวน (แต้ม)</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border border-blue-200 bg-white text-blue-900 rounded-lg mb-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={localConfig.pointRedemptionRate} 
                                onChange={(e) => setLocalConfig({...localConfig, pointRedemptionRate: parseFloat(e.target.value) || 0})}
                                />
                            <p className="text-xs text-blue-500">= ส่วนลด 1 บาท</p>
                        </div>
                        </div>
                    )}

                    {/* Stamps Config */}
                    {localConfig.loyaltySystem === 'stamps' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                    <label className="block text-sm font-bold text-purple-900 mb-2">เงื่อนไขการได้ดวงตรา</label>
                                    <label className="block text-xs text-purple-600 mb-1">ยอดซื้อขั้นต่ำต่อบิล (บาท)</label>
                                    <input 
                                        type="number" 
                                        className="w-full p-2 border border-purple-200 bg-white text-purple-900 rounded-lg mb-1 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        value={localConfig.stampMinSpend} 
                                        onChange={(e) => setLocalConfig({...localConfig, stampMinSpend: parseFloat(e.target.value) || 0})}
                                    />
                                    <p className="text-xs text-purple-500">= ได้รับ 1 ดวง (จำกัด 1 ดวง/บิล)</p>
                                </div>
                                <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                                    <label className="block text-sm font-bold text-pink-900 mb-2">ของรางวัล</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs text-pink-600 mb-1">ครบ (ดวง)</label>
                                            <input 
                                                type="number" 
                                                className="w-full p-2 border border-pink-200 bg-white text-pink-900 rounded-lg"
                                                value={localConfig.stampsPerReward} 
                                                onChange={(e) => setLocalConfig({...localConfig, stampsPerReward: parseInt(e.target.value) || 0})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-pink-600 mb-1">ลดทันที (บาท)</label>
                                            <input 
                                                type="number" 
                                                className="w-full p-2 border border-pink-200 bg-white text-pink-900 rounded-lg"
                                                value={localConfig.stampRewardValue} 
                                                onChange={(e) => setLocalConfig({...localConfig, stampRewardValue: parseFloat(e.target.value) || 0})}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-pink-500 mt-1">เช่น ครบ 10 ดวง รับส่วนลด 50 บาท</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              )}

              {/* Coupons Settings */}
              {activeTab === 'coupons' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-fade-in">
                   <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">จัดการคูปองส่วนลด</h2>
                   {/* Add Coupon Form */}
                   <form onSubmit={handleAddCoupon} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-6 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="lg:col-span-2">
                         <label className="block text-xs font-bold text-slate-500 mb-1">โค้ดคูปอง</label>
                         <input 
                            type="text" 
                            required
                            placeholder="เช่น SALE50"
                            className={inputClass}
                            value={newCoupon.code}
                            onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">ประเภท</label>
                         <select 
                            className={inputClass}
                            value={newCoupon.type}
                            onChange={(e) => setNewCoupon({...newCoupon, type: e.target.value as 'percent' | 'amount'})}
                         >
                            <option value="amount">บาท</option>
                            <option value="percent">%</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">มูลค่า</label>
                         <input 
                            type="number" 
                            required
                            className={inputClass}
                            value={newCoupon.value || ''}
                            onChange={(e) => setNewCoupon({...newCoupon, value: parseFloat(e.target.value)})}
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12}/> วันเริ่ม</label>
                         <input 
                            type="date" 
                            className={`${inputClass} text-xs`}
                            value={newCoupon.startDate || ''}
                            onChange={(e) => setNewCoupon({...newCoupon, startDate: e.target.value})}
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12}/> วันสิ้นสุด</label>
                         <input 
                            type="date" 
                            className={`${inputClass} text-xs`}
                            value={newCoupon.endDate || ''}
                            onChange={(e) => setNewCoupon({...newCoupon, endDate: e.target.value})}
                         />
                      </div>
                      <div className="lg:col-span-6 flex justify-end mt-2">
                        <button type="submit" className="w-full sm:w-auto bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm font-bold text-sm">
                            <Plus size={18} /> เพิ่มคูปอง
                        </button>
                      </div>
                   </form>

                   {/* Coupon List */}
                   <div className="space-y-2">
                     {coupons.length === 0 ? (
                       <p className="text-center text-slate-400 py-4 text-sm">ยังไม่มีคูปองส่วนลด</p>
                     ) : (
                       coupons.map((coupon, idx) => (
                         <div key={idx} className={`flex items-center justify-between p-3 border rounded transition-colors ${coupon.isActive ? 'bg-white border-slate-100 hover:border-primary-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                            <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center ${coupon.isActive ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-400'}`}>
                                  <TicketPercent size={20} />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                    <p className={`font-bold ${coupon.isActive ? 'text-slate-800' : 'text-slate-500 line-through'}`}>{coupon.code}</p>
                                    {!coupon.isActive && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">ปิดใช้งาน</span>}
                                  </div>
                                  <div className="text-xs text-slate-500 flex flex-col sm:flex-row sm:gap-3">
                                      <span>ลด {coupon.value} {coupon.type === 'percent' ? '%' : localConfig.currency}</span>
                                      {(coupon.startDate || coupon.endDate) && (
                                          <span className="flex items-center gap-1 text-slate-400">
                                              <Calendar size={10} />
                                              {coupon.startDate ? new Date(coupon.startDate).toLocaleDateString('th-TH') : '...'} - {coupon.endDate ? new Date(coupon.endDate).toLocaleDateString('th-TH') : '...'}
                                          </span>
                                      )}
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => updateCoupon({...coupon, isActive: !coupon.isActive})}
                                    title={coupon.isActive ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                                    className="transition-colors"
                                >
                                    {coupon.isActive ? (
                                        <ToggleRight size={28} className="text-green-500 hover:text-green-600"/>
                                    ) : (
                                        <ToggleLeft size={28} className="text-slate-300 hover:text-slate-400"/>
                                    )}
                                </button>
                                <button onClick={() => handleDeleteCoupon(coupon.code)} className="text-slate-400 hover:text-red-500 p-2">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                         </div>
                       ))
                     )}
                   </div>
                </div>
              )}

              {/* Connect Settings */}
              {activeTab === 'connect' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-fade-in">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">เชื่อมต่อภายนอก</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Google Apps Script Web App URL</label>
                            <input 
                              type="text" 
                              placeholder="https://script.google.com/macros/s/..." 
                              className={`${inputClass} font-mono text-xs mb-2`}
                              value={localConfig.googleSheetsUrl || ''} 
                              onChange={(e) => setLocalConfig({...localConfig, googleSheetsUrl: e.target.value})} 
                            />
                        </div>

                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Link size={12}/> Google Apps Script Code
                                </span>
                                <button 
                                    onClick={() => {
                                        const scriptCode = `const SHEET_NAME_ORDERS = "Orders";
const SHEET_NAME_PRODUCTS = "Products";

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = {
    status: "online",
    timestamp: new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const action = contents.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "ADD_ORDER") {
      const order = contents.data;
      let sheet = ss.getSheetByName(SHEET_NAME_ORDERS);
      if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME_ORDERS);
        sheet.appendRow(["เวลา", "เลขที่บิล", "รายการสินค้า", "ยอดรวม", "ส่วนลด", "การชำระเงิน", "พนักงาน"]);
        sheet.setFrozenRows(1);
      }
      
      const itemsDesc = order.items.map(item => \`\${item.name} x\${item.quantity}\`).join(", ");
      
      sheet.appendRow([
        new Date(order.timestamp).toLocaleString("th-TH"),
        order.id,
        itemsDesc,
        order.total,
        order.discount,
        order.paymentMethod,
        order.cashierName
      ]);
      
      // Update inventory sheet if it exists
      const prodSheet = ss.getSheetByName(SHEET_NAME_PRODUCTS);
      if (prodSheet) {
        const prodData = prodSheet.getDataRange().getValues();
        order.items.forEach(item => {
          for(let i = 1; i < prodData.length; i++) {
            if(prodData[i][0] == item.id || prodData[i][1] == item.name) {
              const currentStock = prodData[i][3];
              prodSheet.getRange(i + 1, 4).setValue(currentStock - item.quantity);
              break;
            }
          }
        });
      }
    }
    
    if (action === "SYNC_ALL") {
      if (contents.allProducts) {
        let sheet = ss.getSheetByName(SHEET_NAME_PRODUCTS);
        if (!sheet) {
          sheet = ss.insertSheet(SHEET_NAME_PRODUCTS);
          sheet.appendRow(["ID", "Name", "Price", "Stock", "Category"]);
          sheet.setFrozenRows(1);
        }
        sheet.clearContents();
        sheet.appendRow(["ID", "Name", "Price", "Stock", "Category"]);
        contents.allProducts.forEach(p => {
          sheet.appendRow([p.id, p.name, p.price, p.stock, p.category]);
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "success", action: action}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
                                        navigator.clipboard.writeText(scriptCode);
                                        alert("คัดลอกโค้ดเรียบร้อยแล้ว!");
                                    }}
                                    className="text-xs text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1.5 transition-colors"
                                >
                                    <Plus size={14}/> คัดลอกโค้ด
                                </button>
                            </div>
                            <div className="p-4 overflow-x-auto">
                                <pre className="text-[10px] text-slate-300 font-mono leading-relaxed">
{`const SHEET_NAME_ORDERS = "Orders";
const SHEET_NAME_PRODUCTS = "Products";

function doGet(e) { ... }
function doPost(e) {
  const contents = JSON.parse(e.postData.contents);
  const action = contents.action;
  // บันทึกข้อมูลไปยัง Google Sheets ตามแอคชั่น...
}`}
                                </pre>
                            </div>
                        </div>

                        <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <Shield size={14} className="text-primary-600"/> วิธีตั้งค่าการเชื่อมต่อ:
                            </p>
                            <ol className="list-decimal list-inside space-y-1.5 ml-1">
                                <li>สร้าง <strong>Google Sheet</strong> ใหม่</li>
                                <li>ไปที่เมนู <strong>Extensions (ส่วนขยาย)</strong> {'>'} <strong>Apps Script</strong></li>
                                <li>คลิกปุ่ม <strong>"คัดลอกโค้ด"</strong> ด้านบน แล้วนำไปวางใน Script Editor แทนที่ของเดิมทั้งหมด</li>
                                <li>กด <strong>Deploy (ทำให้ใช้งานได้)</strong> {'>'} <strong>New Deployment</strong></li>
                                <li>เลือกประเภทเป็น <strong>Web App</strong></li>
                                <li>ตั้งค่า <strong>Who has access (ผู้มีสิทธิ์เข้าถึง)</strong> เป็น <strong>"Anyone" (ทุกคน)</strong></li>
                                <li>คัดลอก <strong>Web App URL</strong> ที่ได้ มาวางในช่องด้านบนแล้วกดบันทึก</li>
                            </ol>
                        </div>
                    </div>
                </div>
              )}
              
              {/* Admin Settings */}
              {activeTab === 'admin' && (
                <>
                {!isCurrentUserAdmin ? (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 animate-fade-in flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
                        <p className="text-slate-500 mb-6 max-w-sm">เฉพาะผู้ดูแลระบบหลักเท่านั้นที่สามารถจัดการผู้ใช้งานและตำแหน่งงานได้</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                    {/* User Management */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <UserCog size={18} className="text-primary-600"/> จัดการผู้ใช้งาน (User Management)
                                </h3>
                                <p className="text-xs text-slate-500">เพิ่ม/ลบ พนักงานและกำหนดตำแหน่ง</p>
                            </div>
                            <button 
                                onClick={() => openUserModal()}
                                className="bg-primary-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-primary-700 flex items-center gap-1 shadow-sm"
                            >
                                <Plus size={16} /> เพิ่มผู้ใช้
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {users.map(user => {
                                const userRole = roles.find(r => r.id === user.roleId);
                                return (
                                    <div key={user.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white hover:shadow-sm transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${userRole?.id === 'admin' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200">
                                                        {userRole?.name || 'Unknown Role'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openUserModal(user)} className="text-slate-400 hover:text-primary-600 p-2 hover:bg-slate-50 rounded">
                                                <Edit size={16} />
                                            </button>
                                            {user.id !== currentUser?.id && (
                                                <button onClick={() => handleDeleteUser(user.id, user.name)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-slate-50 rounded">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Role Management */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Shield size={18} className="text-purple-600"/> จัดการตำแหน่ง & สิทธิ์ (Roles & Permissions)
                                </h3>
                                <p className="text-xs text-slate-500">กำหนดการเข้าถึงเมนูต่างๆ ตามตำแหน่ง</p>
                            </div>
                            <button 
                                onClick={() => openRoleModal()}
                                className="bg-purple-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-700 flex items-center gap-1 shadow-sm"
                            >
                                <Plus size={16} /> เพิ่มตำแหน่ง
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {roles.map(role => (
                                <div key={role.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white hover:shadow-sm transition-all">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{role.name}</p>
                                        <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">
                                            เข้าถึง: {role.permissions.join(', ')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openRoleModal(role)} className="text-slate-400 hover:text-primary-600 p-2 hover:bg-slate-50 rounded">
                                            <Edit size={16} />
                                        </button>
                                        {!role.isSystem && (
                                            <button onClick={() => handleDeleteRole(role.id, role.name)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-slate-50 rounded">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    </div>
                )}
                </>
              )}

              {/* Save Button */}
              {activeTab !== 'coupons' && activeTab !== 'admin' && (
                 <div className="mt-6 pb-6">
                    <button 
                      onClick={handleSave} 
                      className="w-full bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Save size={20} />
                      บันทึกการเปลี่ยนแปลง
                    </button>
                 </div>
              )}
            </div>

            {/* User Management Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative">
                        <button onClick={() => setIsUserModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        <h2 className="text-xl font-bold mb-6 text-slate-800">{isEditingUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</h2>
                        
                        <form onSubmit={handleUserSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อผู้ใช้งาน</label>
                                <input 
                                    required 
                                    type="text" 
                                    className={inputClass} 
                                    value={userFormData.name} 
                                    onChange={e => setUserFormData({...userFormData, name: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">อีเมลผู้ใช้ (Google Email)</label>
                                <input 
                                    required 
                                    type="email" 
                                    className={inputClass} 
                                    value={userFormData.email} 
                                    onChange={e => setUserFormData({...userFormData, email: e.target.value})} 
                                />
                                <p className="text-[10px] text-slate-400 mt-1">* ผู้ใช้ต้องล็อกอินด้วยอีเมลนี้เพื่อเข้าใช้งานระบบ</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ตำแหน่ง (Role)</label>
                                <select 
                                    className={inputClass}
                                    value={userFormData.roleId}
                                    onChange={e => setUserFormData({...userFormData, roleId: e.target.value})}
                                >
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-slate-700">ยกเลิก</button>
                                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-md shadow-primary-200">
                                    <Save size={18} className="inline mr-1"/> บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Role Management Modal */}
            {isRoleModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
                        <button onClick={() => setIsRoleModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        <h2 className="text-xl font-bold mb-6 text-slate-800">{isEditingRole ? 'แก้ไขตำแหน่ง' : 'เพิ่มตำแหน่งใหม่'}</h2>
                        
                        <form onSubmit={handleRoleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อตำแหน่ง</label>
                                <input 
                                    required 
                                    type="text" 
                                    className={inputClass} 
                                    value={roleFormData.name} 
                                    onChange={e => setRoleFormData({...roleFormData, name: e.target.value})}
                                    disabled={roleFormData.isSystem} 
                                />
                                {roleFormData.isSystem && <p className="text-xs text-orange-500 mt-1">* ชื่อตำแหน่งของระบบไม่สามารถแก้ไขได้</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">สิทธิ์การเข้าถึงเมนู</label>
                                <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
                                    {availablePermissions.map(perm => {
                                        const isChecked = roleFormData.permissions.includes(perm.id);
                                        return (
                                            <div 
                                                key={perm.id} 
                                                onClick={() => togglePermission(perm.id)}
                                                className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-white border border-transparent hover:border-slate-200 transition-colors select-none"
                                            >
                                                <div className={`text-primary-600 transition-colors ${isChecked ? 'opacity-100' : 'opacity-40'}`}>
                                                    {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </div>
                                                <span className={`text-sm ${isChecked ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                                                    {perm.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsRoleModalOpen(false)} className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-slate-700">ยกเลิก</button>
                                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-md shadow-primary-200">
                                    <Save size={18} className="inline mr-1"/> บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Generic Delete Confirmation Modal */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-center text-slate-900 mb-2">{deleteConfirmation.title}</h3>
                        <p className="text-sm text-center text-slate-500 mb-6 whitespace-pre-line">
                            {deleteConfirmation.message}
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteConfirmation(prev => ({...prev, isOpen: false}))}
                                className="flex-1 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                onClick={deleteConfirmation.onConfirm}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
                            >
                                ลบข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AppContent: React.FC = () => {
  const { currentUser } = useStore();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  if (!currentUser) {
    return <Login />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'pos': return <POS />;
      case 'products': return <ProductManagement />;
      case 'members': return <MemberManagement />;
      case 'orders': return <OrderHistory />;
      case 'settings': return <SettingsView />;
      case 'queue': return <QueueManagement />;
      case 'discounts': return <DiscountHistory />;
      case 'sales-report': return <SalesReport />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      <main className="flex-1 overflow-hidden relative">
        {renderView()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;
