
export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number; // Added cost price
  category: string;
  stock: number;
  image: string;
  description?: string;
  barcode?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Coupon {
  code: string;
  type: 'percent' | 'amount';
  value: number;
  description?: string;
  startDate?: string; // ISO Date YYYY-MM-DD
  endDate?: string;   // ISO Date YYYY-MM-DD
  isActive: boolean;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  points: number;
  stamps: number;
  registerDate: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: ViewState[];
  isSystem?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  isAdmin?: boolean;
}

export type OrderStatus = 'completed' | 'preparing' | 'ready';

export type PaymentMethodType = 'cash' | 'promptpay' | 'truemoney' | 'transfer' | 'ewallet' | 'card';

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  discount: number;
  discountType: 'percent' | 'amount';
  couponCode?: string;
  memberId?: string;
  cashierName?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  stampsEarned?: number;
  stampsRedeemed?: number;
  paymentMethod: PaymentMethodType;
  timestamp: string;
  cashReceived?: number;
  change?: number;
  queueNumber?: number;
  status: OrderStatus;
}

export interface RestockRequest {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  contactInfo: string;
  requestDate: string;
  status: 'pending' | 'notified';
}

export interface StoreConfig {
  name: string;
  address: string;
  taxRate: number;
  currency: string;
  logoUrl: string;
  themeColor: string;
  googleSheetsUrl?: string;
  lowStockThreshold: number;
  
  paymentMethods: {
    cash: boolean;
    promptpay: boolean;
    truemoney: boolean;
    transfer: boolean;
    ewallet: boolean;
    card: boolean;
  };

  promptPayQr?: string;
  trueMoneyQr?: string;
  
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;

  loyaltySystem: 'points' | 'stamps' | 'none';
  
  pointEarningRate: number;
  pointRedemptionRate: number;
  
  stampMinSpend: number;
  stampsPerReward: number;
  stampRewardValue: number;

  aiApiKey?: string;
  queueEnabled: boolean;
  queueStepReadyEnabled: boolean;
}

export type ViewState = 'dashboard' | 'pos' | 'products' | 'members' | 'orders' | 'settings' | 'login' | 'queue' | 'discounts' | 'sales-report';

export interface DashboardStats {
  todaySales: number;
  todayCost: number; // New
  todayProfit: number; // New
  monthlyProfit: number; // New
  orderCount: number;
  lowStockCount: number;
  topProducts: { name: string; sold: number }[];
}
