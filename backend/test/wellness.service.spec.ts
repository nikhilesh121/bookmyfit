import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WellnessService } from '../src/modules/wellness/wellness.module';

const SERVICE_ID = '11111111-1111-4111-8111-111111111111';

function createService(options: {
  service?: Record<string, any> | null;
  partner?: Record<string, any> | null;
} = {}) {
  const defaultPartner = {
    id: '22222222-2222-4222-8222-222222222222',
    status: 'active',
  };
  const defaultService = {
    id: SERVICE_ID,
    partnerId: defaultPartner.id,
    price: 1000,
    isActive: true,
    approvalStatus: 'approved',
  };
  const storedPartner = options.partner === undefined ? defaultPartner : options.partner;
  const storedService = options.service === undefined ? defaultService : options.service;
  const partners = {
    findOne: jest.fn(async ({ where }: any) => storedPartner
      && Object.entries(where).every(([key, value]) => storedPartner[key] === value)
        ? storedPartner
        : null),
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => data),
    update: jest.fn(),
  };
  const services = {
    findOne: jest.fn(async ({ where }: any) => storedService
      && Object.entries(where).every(([key, value]) => storedService[key] === value)
        ? storedService
        : null),
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => data),
    update: jest.fn(),
  };
  const bookings = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'booking-1', ...data })),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const ratings = {};
  const configRepo = {
    findOne: jest.fn().mockResolvedValue(null),
  };
  const users = {};
  const cashfree = {
    createOrder: jest.fn().mockResolvedValue({ orderId: 'payment-1' }),
  };
  const service = new WellnessService(
    partners as any,
    services as any,
    bookings as any,
    ratings as any,
    configRepo as any,
    users as any,
    cashfree as any,
  );
  return { service, partners, services, bookings, cashfree };
}

describe('WellnessService booking details', () => {
  it('persists a trimmed optional special request and returns both response aliases', async () => {
    const { service, partners, services, bookings, cashfree } = createService();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const result = await service.book('user-1', SERVICE_ID, future, '9999999999', '  Quiet room, please  ');

    expect(bookings.create).toHaveBeenCalledWith(expect.objectContaining({
      bookingDate: new Date(future),
      specialRequest: 'Quiet room, please',
    }));
    expect(result.booking).toEqual(expect.objectContaining({
      specialRequest: 'Quiet room, please',
      note: 'Quiet room, please',
    }));
    expect(services.findOne).toHaveBeenCalledWith({
      where: { id: SERVICE_ID, isActive: true, approvalStatus: 'approved' },
    });
    expect(partners.findOne).toHaveBeenCalledWith({
      where: { id: '22222222-2222-4222-8222-222222222222', status: 'active' },
    });
    expect(cashfree.createOrder).toHaveBeenCalledTimes(1);
  });

  it('stores an omitted or blank special request as null', async () => {
    const { service, bookings } = createService();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const result = await service.book('user-1', SERVICE_ID, future, '9999999999', '   ');

    expect(bookings.create).toHaveBeenCalledWith(expect.objectContaining({ specialRequest: null }));
    expect(result.booking).toEqual(expect.objectContaining({ specialRequest: null, note: null }));
  });

  it('returns persisted special requests from customer booking lists', async () => {
    const { service, bookings } = createService();
    bookings.find.mockResolvedValue([{
      id: 'booking-1',
      userId: 'user-1',
      partnerId: 'partner-1',
      serviceId: SERVICE_ID,
      bookingDate: new Date(Date.now() + 60 * 60 * 1000),
      specialRequest: 'Use fragrance-free oil',
      status: 'confirmed',
      amount: 1000,
    }]);

    const result = await service.myBookings('user-1');

    expect(result[0]).toEqual(expect.objectContaining({
      specialRequest: 'Use fragrance-free oil',
      note: 'Use fragrance-free oil',
    }));
  });

  it.each([
    ['an invalid date', 'not-a-date', 'bookingDate must be a valid date'],
    ['a past date', new Date(Date.now() - 60 * 1000).toISOString(), 'bookingDate must be in the future'],
  ])('rejects %s before creating a booking or payment', async (_label, bookingDate, message) => {
    const { service, services, bookings, cashfree } = createService();

    await expect(service.book('user-1', SERVICE_ID, bookingDate, '9999999999'))
      .rejects
      .toThrow(new BadRequestException(message));
    expect(services.findOne).not.toHaveBeenCalled();
    expect(bookings.save).not.toHaveBeenCalled();
    expect(cashfree.createOrder).not.toHaveBeenCalled();
  });

  it.each([
    ['inactive', { id: SERVICE_ID, partnerId: 'partner-1', price: 1000, isActive: false, approvalStatus: 'approved' }],
    ['unapproved pending', { id: SERVICE_ID, partnerId: 'partner-1', price: 1000, isActive: true, approvalStatus: 'pending' }],
    ['unapproved rejected', { id: SERVICE_ID, partnerId: 'partner-1', price: 1000, isActive: true, approvalStatus: 'rejected' }],
  ])('rejects a %s service before creating a booking or payment', async (_label, hiddenService) => {
    const { service, services, partners, bookings, cashfree } = createService({ service: hiddenService });
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await expect(service.book('user-1', SERVICE_ID, future, '9999999999'))
      .rejects
      .toThrow(new NotFoundException('Service not found'));
    expect(services.findOne).toHaveBeenCalledWith({
      where: { id: SERVICE_ID, isActive: true, approvalStatus: 'approved' },
    });
    expect(partners.findOne).not.toHaveBeenCalled();
    expect(bookings.save).not.toHaveBeenCalled();
    expect(cashfree.createOrder).not.toHaveBeenCalled();
  });

  it('rejects a service whose partner is not active before creating a booking or payment', async () => {
    const { service, partners, bookings, cashfree } = createService({
      partner: { id: '22222222-2222-4222-8222-222222222222', status: 'inactive' },
    });
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await expect(service.book('user-1', SERVICE_ID, future, '9999999999'))
      .rejects
      .toThrow(new NotFoundException('Wellness partner not found'));
    expect(partners.findOne).toHaveBeenCalledWith({
      where: { id: '22222222-2222-4222-8222-222222222222', status: 'active' },
    });
    expect(bookings.save).not.toHaveBeenCalled();
    expect(cashfree.createOrder).not.toHaveBeenCalled();
  });

  it('does not let a customer confirm an unpaid wellness booking', async () => {
    const { service, bookings } = createService();
    bookings.findOne.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      status: 'pending',
      specialRequest: null,
    });

    await expect(service.confirmBooking('booking-1', 'user-1'))
      .rejects
      .toThrow(new BadRequestException('Payment has not been confirmed for this booking'));
    expect(bookings.save).not.toHaveBeenCalled();
  });

  it('only returns a confirmed booking owned by the requesting customer', async () => {
    const { service, bookings } = createService();
    bookings.findOne.mockImplementation(async ({ where }: any) => (
      where.id === 'booking-1' && where.userId === 'user-1'
        ? { id: 'booking-1', userId: 'user-1', status: 'confirmed', specialRequest: 'Quiet room' }
        : null
    ));

    await expect(service.confirmBooking('booking-1', 'other-user'))
      .rejects
      .toThrow(new NotFoundException('Booking not found'));
    await expect(service.confirmBooking('booking-1', 'user-1'))
      .resolves
      .toEqual(expect.objectContaining({ id: 'booking-1', status: 'confirmed', note: 'Quiet room' }));
    expect(bookings.save).not.toHaveBeenCalled();
  });

  it('enforces valid partner booking status transitions', async () => {
    const { service, bookings } = createService();
    bookings.findOne.mockResolvedValue({
      id: 'booking-1',
      partnerId: 'partner-1',
      status: 'pending',
      specialRequest: null,
    });

    await expect(service.updateBookingStatus('partner-1', 'booking-1', 'confirmed'))
      .rejects
      .toThrow(new BadRequestException('Cannot change booking status from pending to confirmed'));

    bookings.findOne.mockResolvedValue({
      id: 'booking-1',
      partnerId: 'partner-1',
      status: 'confirmed',
      specialRequest: null,
    });
    await expect(service.updateBookingStatus('partner-1', 'booking-1', 'completed'))
      .resolves
      .toEqual(expect.objectContaining({ status: 'completed' }));
    expect(bookings.update).toHaveBeenCalledWith('booking-1', { status: 'completed' });
  });

  it('keeps partner-created services inactive and pending for admin review', async () => {
    const { service, services } = createService();

    const result = await service.createPartnerService('partner-1', {
      name: 'Sports Massage',
      price: 1200,
      durationMinutes: 60,
      isActive: true,
      approvalStatus: 'approved',
    });

    expect(result).toEqual(expect.objectContaining({
      partnerId: 'partner-1',
      isActive: false,
      approvalStatus: 'pending',
    }));
    expect(services.save).toHaveBeenCalledTimes(1);
  });
});
