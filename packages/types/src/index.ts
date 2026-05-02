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
  loyaltyPoints?: number;
  referralCode?: string;
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
  ratingCount?: number;
  status: GymStatus;
  commissionRate: number;
  ratePerDay?: number;
  dayPassPrice?: number | null;
  sameGymMonthlyPrice?: number | null;
  capacity?: number;
  coverPhoto?: string;
  photos?: string[];
  amenities?: string[];
  categories?: string[];
  ownerId?: string;
  kycStatus?: string;
  createdAt: string;
}

export interface GymPlan {
  id: string;
  gymId: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  sessionsPerDay?: number;
  features?: string[];
  isActive: boolean;
  createdAt: string;
}

export interface MultiGymNetwork {
  id: string;
  gymId: string;
  isActive: boolean;
  addedAt: string;
}

// ============ Subscription Types ============
export type PlanType = 'day_pass' | 'same_gym' | 'multi_gym';
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
  gymPlanId?: string;
  corporateId?: string;
  invoiceNumber?: string;
}

export interface BookingQr {
  id: string;
  token: string;
  expiresAt: string;
  bookedAt: string;
  gymId: string;
  gymName: string;
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
  deviceId?: string;
  failReason?: string;
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
  disputeReason?: string;
  breakdown?: {
    billableDays?: number;
    ratePerDay?: number;
    multiGymGross?: number;
    multiGymCommission?: number;
    multiGymPayout?: number;
    individualRevenue?: number;
    individualCommission?: number;
    individualPayout?: number;
    totalCheckins?: number;
  };
  createdAt: string;
}

// ============ Corporate Types ============
export interface CorporateAccount {
  id: string;
  companyName: string;
  email: string;
  planType: string;
  totalSeats: number;
  assignedSeats: number;
  billingContact: string;
  adminUserId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CorporateEmployee {
  id: string;
  corporateId: string;
  userId: string;
  employeeCode: string;
  department?: string;
  status: 'active' | 'inactive';
  assignedDate: string;
}

// ============ Trainer Types ============
export interface Trainer {
  id: string;
  gymId: string;
  name: string;
  specialization?: string;
  photoUrl?: string;
  bio?: string;
  pricePerSession: number;
  sessionPackages?: Array<{ sessions: number; price: number }>;
  rating: number;
  ratingCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface TrainerBooking {
  id: string;
  userId: string;
  trainerId: string;
  gymId: string;
  sessionDate: string;
  sessions: number;
  amount: number;
  platformCommission: number;
  status: string;
  cashfreeOrderId?: string;
  createdAt: string;
}

// ============ Wellness Types ============
export interface WellnessPartner {
  id: string;
  name: string;
  serviceType: string;
  city: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  commissionRate: number;
  status: string;
  photos?: string[];
  rating: number;
  reviewCount: number;
  discountPercent?: number;
  distanceLabel?: string;
  ownerId?: string;
  createdAt: string;
}

export interface WellnessService {
  id: string;
  partnerId: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  durationMinutes: number;
  isActive: boolean;
  imageUrl?: string;
  category?: string;
}

export interface WellnessBooking {
  id: string;
  userId: string;
  partnerId: string;
  serviceId: string;
  bookingDate: string;
  amount: number;
  platformCommission: number;
  status: string;
  cashfreeOrderId?: string;
  createdAt: string;
}

// ============ Slots Types ============
export interface GymSlot {
  id: string;
  gymId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  status: string;
  createdAt: string;
}

export interface SlotBooking {
  id: string;
  slotId: string;
  userId: string;
  gymId: string;
  status: string;
  createdAt: string;
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

// ============ Misc Types ============
export interface FraudAlert {
  id: string;
  userId?: string;
  eventType?: string;
  gymId?: string;
  gymName?: string;
  riskScore: number;
  device?: string;
  details?: string;
  status: string;
  createdAt: string;
}

export interface Rating {
  id: string;
  userId: string;
  gymId?: string;
  trainerId?: string;
  wellnessPartnerId?: string;
  stars: number;
  review?: string;
  status: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  perUserLimit: number;
  usedCount: number;
  applicableTo: string[];
  isActive: boolean;
  createdAt: string;
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
