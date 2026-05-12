import { BadRequestException, Logger } from '@nestjs/common';
import { CashfreeService } from '../src/modules/payments/cashfree.service';
import * as crypto from 'crypto';

describe('CashfreeService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not return a mock payment when Cashfree fails in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CASHFREE_MOCK_MODE = 'true';
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: 'authentication Failed' }),
    });

    const service = new CashfreeService();

    await expect(
      service.createOrder({
        orderId: 'SUB_TEST_1',
        amount: 100,
        customerId: 'user-1',
        customerPhone: '9999999999',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows mock payments only in explicit non-production mock mode', async () => {
    process.env.NODE_ENV = 'development';
    process.env.CASHFREE_MOCK_MODE = 'true';
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const service = new CashfreeService();

    await expect(
      service.createOrder({
        orderId: 'SUB_TEST_2',
        amount: 100,
        customerId: 'user-1',
        customerPhone: '9999999999',
      }),
    ).resolves.toMatchObject({
      orderId: 'SUB_TEST_2',
      orderStatus: 'ACTIVE',
      mock: true,
    });
  });

  it('verifies Cashfree webhook signatures with the configured client secret', () => {
    process.env.CASHFREE_CLIENT_SECRET = 'secret-for-test';
    const service = new CashfreeService();
    const rawBody = JSON.stringify({ data: { order: { order_id: 'ORDER_1' } } });
    const timestamp = '1778000000';
    const signature = crypto
      .createHmac('sha256', 'secret-for-test')
      .update(timestamp + rawBody)
      .digest('base64');

    expect(service.verifyWebhookSignature(rawBody, timestamp, signature)).toBe(true);
    expect(service.verifyWebhookSignature(rawBody, timestamp, 'bad-signature')).toBe(false);
  });
});
