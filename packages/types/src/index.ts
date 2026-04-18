// ============ User Types ============
export type UserRole = 'super_admin' | 'gym_owner' | 'gym_staff' | 'corporate_admin' | 'wellness_partner' | 'end_user';

export interface User {
  id: string;
  phone: string;
  email?: string;
  name: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  role: UserRole;
  deviceId?: string;
  createdAt: string;
}

// ============ Gym Types ============
export type GymTier = 'standard' | 'premium' | 'corporate_exclusive';
export type GymStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface Gym {
  id: string;
  name: string;
  city: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  tier: GymTier;
  rating: number;
  status: GymStatus;
  commissionRate: number;
  coverPhoto?: string;
  photos?: string[];
  amenities?: string[];
  categories?: string[];
  createdAt: string;
}

// ============ Subscription Types ============
export type PlanType = 'individual' | 'pro' | 'max' | 'elite';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'frozen';

export interface Subscription {
  id: string;
  userId: string;
  planType: PlanType;
  durationMonths: number;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  amountPaid: number;
  gymIds?: string[];
}

export interface SubscriptionPlan {
  id: string;
  type: PlanType;
  name: string;
  description: string;
  basePrice: number;
  features: string[];
  maxGyms?: number;
  visitLimit?: number;
}

// ============ Check-in Types ============
export type CheckinStatus = 'success' | 'failed_expired' | 'failed_invalid' | 'failed_daily_limit' | 'failed_device_mismatch';

export interface Checkin {
  id: string;
  userId: string;
  gymId: string;
  subscriptionId: string;
  checkinTime: string;
  qrToken: string;
  status: CheckinStatus;
}

export interface QRToken {
  token: string;
  expiresAt: string;
}

// ============ Settlement Types ============
export type SettlementStatus = 'pending' | 'approved' | 'paid' | 'disputed';
export type RevenueBucket = 'individual_commission' | 'elite_pool' | 'pro_pool' | 'corporate_pool' | 'pt_commission' | 'wellness_commission';

export interface Settlement {
  id: string;
  gymId: string;
  month: string;
  totalRevenue: number;
  commission: number;
  netPayout: number;
  status: SettlementStatus;
  paidDate?: string;
}

// ============ Corporate Types ============
export interface CorporateAccount {
  id: string;
  companyName: string;
  email: string;
  planType: PlanType;
  totalSeats: number;
  assignedSeats: number;
  billingContact: string;
  createdAt: string;
}

export interface CorporateEmployee {
  id: string;
  corporateId: string;
  userId: string;
  employeeCode: string;
  department: string;
  status: 'active' | 'inactive';
  assignedDate: string;
}

// ============ Store Types ============
export interface Product {
  id: string;
  name: string;
  category: 'supplements' | 'accessories' | 'apparel' | 'equipment';
  price: number;
  stock: number;
  images: string[];
  description: string;
}

export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

// ============ API Response Types ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
