import { QrService } from '../src/modules/qr/qr.service';

function queryBuilder(result?: any) {
  const builder: any = {
    where: jest.fn(() => builder),
    andWhere: jest.fn(() => builder),
    orderBy: jest.fn(() => builder),
    update: jest.fn(() => builder),
    set: jest.fn(() => builder),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
    getOne: jest.fn().mockResolvedValue(result),
  };
  return builder;
}

describe('QrService fixed gym QR', () => {
  it('uses an active booked pass before a same-gym membership', async () => {
    const gym = { id: 'gym-1', name: 'Test Gym', status: 'active', ratePerDay: 125 };
    const booking = {
      id: 'booking-1',
      bookingRef: 'BOOK-1',
      userId: 'user-1',
      gymId: gym.id,
      subscriptionId: 'multi-sub',
      slotDate: '2099-01-01',
      status: 'confirmed',
    };
    const bookedSub = {
      id: 'multi-sub',
      userId: 'user-1',
      planType: 'multi_gym',
      status: 'active',
      startDate: '2020-01-01',
      endDate: '2099-12-31',
      gymIds: [],
    };
    const sameGymSub = {
      id: 'same-sub',
      userId: 'user-1',
      planType: 'same_gym',
      status: 'active',
      startDate: '2020-01-01',
      endDate: '2099-12-31',
      gymIds: [gym.id],
    };

    const checkins: any = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, id: 'checkin-1', checkinTime: new Date() })),
    };
    const subs: any = {
      createQueryBuilder: jest.fn(() => queryBuilder(sameGymSub)),
      findOne: jest.fn().mockResolvedValue(bookedSub),
    };
    const gyms: any = { findOne: jest.fn().mockResolvedValue(gym) };
    const users: any = { findOne: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Test User' }) };
    const bookingQrs: any = { createQueryBuilder: jest.fn(() => queryBuilder()) };
    const sessionBookings: any = { createQueryBuilder: jest.fn(() => queryBuilder()) };
    const jwt: any = { verify: jest.fn().mockReturnValue({ type: 'gym_fixed', gym: gym.id }) };

    const service = new QrService(
      jwt,
      checkins,
      subs,
      gyms,
      users,
      {} as any,
      bookingQrs,
      sessionBookings,
      {} as any,
      {} as any,
      {} as any,
    );
    (service as any).activeBookingForUserAtGymNow = jest.fn().mockResolvedValue(booking);
    (service as any).ensureDailyCheckinAllowed = jest.fn().mockResolvedValue(undefined);
    (service as any).lockDailyCheckin = jest.fn().mockResolvedValue(undefined);
    (service as any).checkVelocityFraud = jest.fn().mockResolvedValue(undefined);

    const result = await service.validateGymQr('fixed-gym-token', 'user-1');

    expect(result.planType).toBe('multi_gym');
    expect(result.bookingId).toBe(booking.id);
    expect(checkins.create).toHaveBeenCalledWith(expect.objectContaining({
      subscriptionId: bookedSub.id,
      gymId: gym.id,
      userId: booking.userId,
    }));
  });

  it('falls back to a same-gym membership when a current booking subscription is stale', async () => {
    const gym = { id: 'gym-1', name: 'Test Gym', status: 'active', ratePerDay: 125 };
    const booking = {
      id: 'booking-1',
      userId: 'user-1',
      gymId: gym.id,
      subscriptionId: 'expired-multi-sub',
      slotDate: '2099-01-01',
      status: 'confirmed',
    };
    const staleBookedSub = {
      id: 'expired-multi-sub',
      userId: 'user-1',
      planType: 'multi_gym',
      status: 'cancelled',
      startDate: '2020-01-01',
      endDate: '2099-12-31',
      gymIds: [],
    };
    const sameGymSub = {
      id: 'same-sub',
      userId: 'user-1',
      planType: 'same_gym',
      status: 'active',
      startDate: '2020-01-01',
      endDate: '2099-12-31',
      gymIds: [gym.id],
    };
    const checkins: any = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, id: 'checkin-1', checkinTime: new Date() })),
    };
    const subs: any = {
      createQueryBuilder: jest.fn(() => queryBuilder(sameGymSub)),
      findOne: jest.fn().mockResolvedValue(staleBookedSub),
    };
    const service = new QrService(
      { verify: jest.fn().mockReturnValue({ type: 'gym_fixed', gym: gym.id }) } as any,
      checkins,
      subs,
      { findOne: jest.fn().mockResolvedValue(gym) } as any,
      { findOne: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Test User' }) } as any,
      {} as any,
      { createQueryBuilder: jest.fn(() => queryBuilder()) } as any,
      { createQueryBuilder: jest.fn(() => queryBuilder()) } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    (service as any).activeBookingForUserAtGymNow = jest.fn().mockResolvedValue(booking);
    (service as any).ensureDailyCheckinAllowed = jest.fn().mockResolvedValue(undefined);
    (service as any).lockDailyCheckin = jest.fn().mockResolvedValue(undefined);
    (service as any).checkVelocityFraud = jest.fn().mockResolvedValue(undefined);

    const result = await service.validateGymQr('fixed-gym-token', 'user-1');

    expect(result.planType).toBe('same_gym');
    expect(result.message).toBe('Membership check-in recorded');
    expect(checkins.create).toHaveBeenCalledWith(expect.objectContaining({
      subscriptionId: sameGymSub.id,
    }));
  });
});
