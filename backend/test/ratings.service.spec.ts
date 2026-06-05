import { BadRequestException } from '@nestjs/common';
import { RatingsService } from '../src/modules/misc/misc.module';
import { WellnessService } from '../src/modules/wellness/wellness.module';

function chainableQueryBuilder(finalMethod: 'getCount' | 'getRawOne' | 'getRawMany', value: any) {
  const qb: any = {};
  for (const method of ['select', 'addSelect', 'leftJoin', 'where', 'andWhere', 'groupBy', 'orderBy']) {
    qb[method] = jest.fn(() => qb);
  }
  qb[finalMethod] = jest.fn().mockResolvedValue(value);
  return qb;
}

function createService(options: { checkinCount?: number; activePassCount?: number; wellnessBookingCount?: number } = {}) {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'rating-1', createdAt: new Date('2026-05-25T00:00:00Z'), ...data })),
    createQueryBuilder: jest.fn(() => chainableQueryBuilder('getRawOne', { avg: '4', count: '1' })),
  };
  const checkins = {
    count: jest.fn().mockResolvedValue(options.checkinCount ?? 0),
  };
  const subscriptions = {
    createQueryBuilder: jest.fn(() => chainableQueryBuilder('getCount', options.activePassCount ?? 0)),
  };
  const gyms = {
    findOne: jest.fn().mockResolvedValue({ id: 'gym-1', name: 'Test Gym' }),
    findBy: jest.fn().mockResolvedValue([{ id: 'gym-1', name: 'Test Gym' }]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const trainers = {
    findOne: jest.fn(),
    findBy: jest.fn().mockResolvedValue([{ id: 'trainer-1', name: 'Test Trainer' }]),
    update: jest.fn(),
  };
  const wellnessPartners = {
    findOne: jest.fn().mockResolvedValue({ id: 'wellness-1', name: 'Test Wellness' }),
    findBy: jest.fn().mockResolvedValue([{ id: 'wellness-1', name: 'Test Wellness' }]),
    update: jest.fn(),
  };
  const wellnessBookings = {
    count: jest.fn().mockResolvedValue(options.wellnessBookingCount ?? 0),
  };
  const service = new RatingsService(
    repo as any,
    checkins as any,
    subscriptions as any,
    gyms as any,
    trainers as any,
    wellnessPartners as any,
    wellnessBookings as any,
  );
  return { service, repo, checkins, subscriptions, gyms, trainers, wellnessPartners, wellnessBookings };
}

function createWellnessService(ratingRows: any[]) {
  const partner = {
    id: 'wellness-1',
    name: 'Test Wellness',
    serviceType: 'spa',
    serviceTypes: ['spa'],
    rating: 4.8,
    reviewCount: 142,
  };
  const partners = {
    findOne: jest.fn().mockResolvedValue(partner),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const ratingsQb = chainableQueryBuilder('getRawMany', ratingRows);
  const ratings = {
    createQueryBuilder: jest.fn(() => ratingsQb),
  };
  const service = new WellnessService(
    partners as any,
    {} as any,
    {} as any,
    ratings as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { service, partners, ratingsQb };
}

describe('RatingsService', () => {
  it('auto-approves an eligible gym review from an active same-gym/day-pass subscriber', async () => {
    const { service, repo, gyms } = createService({ checkinCount: 0, activePassCount: 1 });

    const rating = await service.submit('user-1', 'gym', 'gym-1', 4, 'Great gym');

    expect(rating.status).toBe('approved');
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      gymId: 'gym-1',
      stars: 4,
      review: 'Great gym',
      status: 'approved',
    }));
    expect(gyms.update).toHaveBeenCalledWith('gym-1', { rating: 4, ratingCount: 1 });
  });

  it('auto-approves an eligible gym review after a successful check-in', async () => {
    const { service, repo } = createService({ checkinCount: 1, activePassCount: 0 });

    const rating = await service.submit('user-1', 'gym', 'gym-1', 5, 'Clean equipment');

    expect(rating.status).toBe('approved');
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      gymId: 'gym-1',
      stars: 5,
      status: 'approved',
    }));
  });

  it('rejects a gym review when the user has no active gym pass and no successful check-in', async () => {
    const { service, repo } = createService({ checkinCount: 0, activePassCount: 0 });

    await expect(service.submit('user-1', 'gym', 'gym-1', 4, 'Trying early'))
      .rejects
      .toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('auto-approves a wellness review after an eligible booking and refreshes its aggregate', async () => {
    const { service, repo, wellnessPartners, wellnessBookings } = createService({ wellnessBookingCount: 1 });

    const rating = await service.submit('user-1', 'wellness', 'wellness-1', 5, 'Excellent massage');

    expect(rating.status).toBe('approved');
    expect(wellnessBookings.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-1', partnerId: 'wellness-1' }),
    }));
    expect(wellnessBookings.count.mock.calls[0][0].where.status.value)
      .toEqual(['confirmed', 'completed', 'paid']);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      wellnessPartnerId: 'wellness-1',
      stars: 5,
      status: 'approved',
    }));
    expect(wellnessPartners.update).toHaveBeenCalledWith('wellness-1', { rating: 4, reviewCount: 1 });
  });

  it('rejects a wellness review without an eligible booking', async () => {
    const { service, repo } = createService({ wellnessBookingCount: 0 });

    await expect(service.submit('user-1', 'wellness', 'wellness-1', 4, 'Trying early'))
      .rejects
      .toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns public wellness reviews without exposing user contact details or ids', async () => {
    const { service, repo } = createService();
    repo.createQueryBuilder.mockReturnValueOnce(chainableQueryBuilder('getRawMany', [{
      id: 'rating-1',
      userId: 'user-123',
      wellnessPartnerId: 'wellness-1',
      stars: '5',
      review: 'Excellent massage',
      status: 'approved',
      createdAt: new Date('2026-05-25T00:00:00Z'),
      userName: 'Asha Rao',
      userEmail: 'asha@example.com',
      userPhone: '9999999999',
    }]));

    const reviews = await service.listForWellness('wellness-1');

    expect(reviews[0]).not.toHaveProperty('userId');
    expect(reviews[0].user).toEqual({ memberCode: 'BMF-USER123000', name: 'Asha Rao' });
    expect(reviews[0].user).not.toHaveProperty('email');
    expect(reviews[0].user).not.toHaveProperty('phone');
    expect(reviews[0].user).not.toHaveProperty('id');
  });

  it('enriches admin rating lists with real target names', async () => {
    const { service, repo } = createService();
    (repo as any).find = jest.fn().mockResolvedValue([
      { id: 'rating-gym', userId: 'user-1', gymId: 'gym-1', status: 'pending', stars: 4 },
      { id: 'rating-trainer', userId: 'user-2', trainerId: 'trainer-1', status: 'pending', stars: 5 },
      { id: 'rating-wellness', userId: 'user-3', wellnessPartnerId: 'wellness-1', status: 'pending', stars: 3 },
    ]);

    const ratings = await service.listPending();

    expect(ratings).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetName: 'Test Gym', target: { type: 'gym', id: 'gym-1', name: 'Test Gym' } }),
      expect.objectContaining({ targetName: 'Test Trainer', target: { type: 'trainer', id: 'trainer-1', name: 'Test Trainer' } }),
      expect.objectContaining({ targetName: 'Test Wellness', target: { type: 'wellness', id: 'wellness-1', name: 'Test Wellness' } }),
    ]));
  });
});

describe('WellnessService live rating aggregates', () => {
  it('returns zero when there are no approved ratings without writing during a read', async () => {
    const { service, partners, ratingsQb } = createWellnessService([]);

    const partner = await service.getPartner('wellness-1');

    expect(ratingsQb.where).toHaveBeenCalledWith('r.status = :status', { status: 'approved' });
    expect(partner).toEqual(expect.objectContaining({ rating: 0, reviewCount: 0 }));
    expect(partners.update).not.toHaveBeenCalled();
  });

  it('returns aggregates calculated from approved rating rows without writing during a read', async () => {
    const { service, partners } = createWellnessService([{
      partnerId: 'wellness-1',
      rating: '4.266666',
      reviewCount: '3',
    }]);

    const partner = await service.getPartner('wellness-1');

    expect(partner).toEqual(expect.objectContaining({ rating: 4.3, reviewCount: 3 }));
    expect(partners.update).not.toHaveBeenCalled();
  });
});
