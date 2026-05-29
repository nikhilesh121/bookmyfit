import { BadRequestException } from '@nestjs/common';
import { RatingsService } from '../src/modules/misc/misc.module';

function chainableQueryBuilder(finalMethod: 'getCount' | 'getRawOne', value: any) {
  const qb: any = {};
  for (const method of ['select', 'addSelect', 'where', 'andWhere', 'groupBy']) {
    qb[method] = jest.fn(() => qb);
  }
  qb[finalMethod] = jest.fn().mockResolvedValue(value);
  return qb;
}

function createService(options: { checkinCount?: number; activePassCount?: number } = {}) {
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
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const trainers = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const wellnessPartners = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const service = new RatingsService(
    repo as any,
    checkins as any,
    subscriptions as any,
    gyms as any,
    trainers as any,
    wellnessPartners as any,
  );
  return { service, repo, checkins, subscriptions, gyms };
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
});
