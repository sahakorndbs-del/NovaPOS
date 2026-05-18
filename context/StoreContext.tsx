
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Product, Order, StoreConfig, DashboardStats, Coupon, Member, User, RestockRequest, OrderStatus, Role, ViewState } from '../types';
import { db, auth, signInWithGoogle, logout as firebaseLogout } from '../lib/firebase';
import { firebaseService } from '../services/firebaseService';
import { onAuthStateChanged } from 'firebase/auth';

interface StoreContextType {
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  members: Member[];
  users: User[];
  roles: Role[];
  currentUser: User | null;
  restockRequests: RestockRequest[];
  storeConfig: StoreConfig;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addOrder: (order: Order) => void;
  deleteOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addCoupon: (coupon: Coupon) => void;
  updateCoupon: (coupon: Coupon) => void;
  deleteCoupon: (code: string) => void;
  addMember: (member: Member) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  addRole: (role: Role) => void;
  updateRole: (role: Role) => void;
  deleteRole: (id: string) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  addRestockRequest: (request: RestockRequest) => void;
  updateConfig: (config: StoreConfig) => void;
  stats: DashboardStats;
  refreshStats: () => void;
  currentThemeColorHex: string; 
  isSyncing: boolean;
}

const THEME_PALETTES: Record<string, Record<string, string>> = {
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764' },
  green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' },
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' }
};

const defaultStoreConfig: StoreConfig = {
  name: "โนว่า คาเฟ่ แอนด์ รีเทล",
  address: "123 ถ.สุขุมวิท เขตวัฒนา กรุงเทพฯ 10110",
  taxRate: 7,
  currency: "฿",
  logoUrl: "",
  themeColor: "blue",
  googleSheetsUrl: "",
  lowStockThreshold: 10,
  paymentMethods: { cash: true, promptpay: true, truemoney: true, transfer: true, ewallet: true, card: true },
  loyaltySystem: 'points', 
  pointEarningRate: 25, 
  pointRedemptionRate: 10, 
  stampMinSpend: 50, 
  stampsPerReward: 10, 
  stampRewardValue: 50, 
  queueEnabled: true,
  queueStepReadyEnabled: true
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(defaultStoreConfig);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auth and Sync synchronization
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const stopSubscriptions = () => {
      unsubs.forEach(unsub => unsub());
      unsubs = [];
    };

    const startSubscriptions = () => {
      unsubs.push(firebaseService.subscribeCollection('products', setProducts));
      unsubs.push(firebaseService.subscribeCollection('orders', (data) => {
        setOrders(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }));
      unsubs.push(firebaseService.subscribeCollection('coupons', setCoupons));
      unsubs.push(firebaseService.subscribeCollection('members', setMembers));
      unsubs.push(firebaseService.subscribeCollection('users', setUsers));
      unsubs.push(firebaseService.subscribeCollection('roles', setRoles));
      unsubs.push(firebaseService.subscribeDoc('config', 'settings', (data) => {
        if (data) setStoreConfig(prev => ({ ...prev, ...data }));
      }));
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        stopSubscriptions();
        startSubscriptions();
      } else {
        stopSubscriptions();
        setCurrentUser(null);
        setProducts([]);
        setOrders([]);
        setCoupons([]);
        setMembers([]);
        setUsers([]);
        setRoles([]);
      }
    });

    return () => {
      unsubscribeAuth();
      stopSubscriptions();
    };
  }, []);

  // Effect to map currentUser when users or auth state changes
  useEffect(() => {
    const fbUser = auth.currentUser;
    if (fbUser) {
      const existingUser = users.find(u => u.email === fbUser.email);
      if (existingUser) {
        setCurrentUser(existingUser);
      } else if (fbUser.email === 'sahakorn.dbs@gmail.com') {
        setCurrentUser({ id: fbUser.uid, name: fbUser.displayName || 'สหกรณ์ DBS', email: fbUser.email!, roleId: 'admin' });
      } else if (users.length > 0) {
        setCurrentUser({ id: fbUser.uid, name: fbUser.displayName || fbUser.email!, email: fbUser.email!, roleId: 'cashier' });
      }
    }
  }, [users]);

  // Theme support
  useEffect(() => {
    const palette = THEME_PALETTES[storeConfig.themeColor] || THEME_PALETTES.blue;
    Object.entries(palette).forEach(([shade, hex]) => {
      document.documentElement.style.setProperty(`--color-primary-${shade}`, hex);
    });
  }, [storeConfig.themeColor]);

  // Derived stats using useMemo (replaces state + useEffect)
  const stats = useMemo<DashboardStats>(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = now.toISOString().slice(0, 7);
    
    const todayOrders = orders.filter(o => o.timestamp.startsWith(todayStr));
    const monthlyOrders = orders.filter(o => o.timestamp.startsWith(monthStr));
    
    const calculateOrderCost = (order: Order) => 
      Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0) : 0;
    
    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const todayCost = todayOrders.reduce((sum, o) => sum + calculateOrderCost(o), 0);
    const monthlySales = monthlyOrders.reduce((sum, o) => sum + o.total, 0);
    const monthlyCost = monthlyOrders.reduce((sum, o) => sum + calculateOrderCost(o), 0);
    
    return {
      todaySales,
      todayCost,
      todayProfit: todaySales - todayCost,
      monthlyProfit: monthlySales - monthlyCost,
      orderCount: todayOrders.length,
      lowStockCount: products.filter(p => p.stock < storeConfig.lowStockThreshold).length,
      topProducts: []
    };
  }, [orders, products, storeConfig.lowStockThreshold]);

  const refreshStats = () => {
    // Stats are now derived automatically via useMemo
  };

  const addOrder = async (order: Order) => {
    setIsSyncing(true);
    try {
      const finalOrder = { ...order, cashierName: currentUser?.name || 'พนักงานขาย' };
      // Update stocks first
      for (const item of finalOrder.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          await firebaseService.set('products', product.id, { ...product, stock: Math.max(0, product.stock - item.quantity) });
        }
      }
      await firebaseService.add('orders', finalOrder);

      // Optional: Sync to Google Sheets if URL is provided
      if (storeConfig.googleSheetsUrl) {
        import('../services/googleSheetsService').then(({ syncToGoogleSheet }) => {
          syncToGoogleSheet('ADD_ORDER', finalOrder, storeConfig.googleSheetsUrl!);
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    const orderToDelete = orders.find(o => o.id === orderId);
    if (!orderToDelete) return;
    setIsSyncing(true);
    try {
      for (const item of orderToDelete.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          await firebaseService.set('products', product.id, { ...product, stock: product.stock + item.quantity });
        }
      }
      await firebaseService.delete('orders', orderId);
    } finally {
      setIsSyncing(false);
    }
  };

  const loginWithGoogle = async () => {
    await signInWithGoogle();
  };

  const logout = () => {
    firebaseLogout();
    setCurrentUser(null);
  };

  return (
    <StoreContext.Provider value={{ 
      products, orders, coupons, members, users, roles, currentUser, restockRequests, storeConfig, 
      addProduct: (p) => firebaseService.set('products', p.id, p), 
      updateProduct: (p) => firebaseService.set('products', p.id, p), 
      deleteProduct: (id) => firebaseService.delete('products', id),
      addOrder, deleteOrder, updateOrderStatus: (id, status) => {
        firebaseService.set('orders', id, { status });
      }, 
      addCoupon: (c) => firebaseService.set('coupons', c.code, c), 
      updateCoupon: (c) => firebaseService.set('coupons', c.code, c), 
      deleteCoupon: (code) => firebaseService.delete('coupons', code),
      addMember: (m) => firebaseService.set('members', m.id, m), 
      updateMember: (m) => firebaseService.set('members', m.id, m), 
      deleteMember: (id) => firebaseService.delete('members', id),
      addUser: (u) => firebaseService.set('users', u.id, u), 
      updateUser: (u) => firebaseService.set('users', u.id, u), 
      deleteUser: (id) => firebaseService.delete('users', id),
      addRole: (r) => firebaseService.set('roles', r.id, r), 
      updateRole: (r) => firebaseService.set('roles', r.id, r), 
      deleteRole: (id) => firebaseService.delete('roles', id), 
      loginWithGoogle, logout,
      addRestockRequest: (r) => firebaseService.add('restockRequests', r), 
      updateConfig: (c) => firebaseService.set('config', 'settings', c), 
      stats, refreshStats, 
      currentThemeColorHex: (THEME_PALETTES[storeConfig.themeColor] || THEME_PALETTES.blue)[600],
      isSyncing
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within a StoreProvider");
  return context;
};
