import type { BookingStatus, FulfilmentMethod, PaymentStatus } from "./bookings";

export interface DashboardBookingCounts {
  pending: number;
  confirmedThisMonth: number;
  completed: number;
}

export interface DashboardRevenue {
  currency: string;
  collected: string;
  thisMonth: string;
  outstanding: string;
}

export interface DashboardUpcomingBooking {
  id: string;
  code: string;
  status: BookingStatus;
  customer: { name: string; phone: string };
  startDate: string;
  endDate: string;
  fulfilmentMethod: FulfilmentMethod;
  totalAmount: string;
  paidAmount: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface DashboardLowStockItem {
  equipmentId: string;
  name: string;
  total: number;
  availableToday: number;
  reservedToday: number;
  daysFullyBooked: number;
  firstFullDate: string;
}

export interface AdminDashboard {
  generatedAt: string;
  asOf: string;
  month: string;
  bookings: DashboardBookingCounts;
  revenue: DashboardRevenue;
  inventory: {
    horizonDays: number;
    lowStock: DashboardLowStockItem[];
  };
  upcoming: DashboardUpcomingBooking[];
}
