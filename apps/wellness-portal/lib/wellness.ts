export type WellnessPartnerSummary = {
  id: string;
  name?: string;
  rating?: number | string;
  reviewCount?: number | string;
  status?: string;
};

type BookingPerson = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  memberCode?: string | null;
};

export type WellnessBooking = {
  id: string;
  user?: BookingPerson | null;
  customer?: BookingPerson | null;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  memberCode?: string | null;
  service?: { id?: string; name?: string | null } | null;
  serviceName?: string | null;
  bookingDate?: string;
  scheduledAt?: string;
  amount?: number | string;
  status?: string;
};

export function numberValue(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function bookingUser(booking: WellnessBooking) {
  const user = booking.user || booking.customer;
  return {
    name: user?.name || booking.userName || user?.memberCode || booking.memberCode || 'Member unavailable',
    email: user?.email || booking.userEmail || null,
    phone: user?.phone || booking.userPhone || null,
    memberCode: user?.memberCode || booking.memberCode || null,
  };
}

export function bookingServiceName(booking: WellnessBooking): string {
  return booking.service?.name || booking.serviceName || '\u2014';
}

export function bookingScheduledAt(booking: WellnessBooking): string | undefined {
  return booking.bookingDate || booking.scheduledAt;
}
