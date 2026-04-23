import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Plan types:
 * - gym_specific:  User subscribes to ONE gym's individual plan. Gym manages pricing.
 * - multigym_pro:  Platform plan (admin-managed). Access any gym, up to 5 distinct gyms per period.
 * - multigym_max:  Platform plan (admin-managed). Access any gym, unlimited.
 *
 * Legacy values (individual/pro/max/elite) kept for DB backward-compat but not used in new code.
 */
export type PlanType = 'gym_specific' | 'multigym_pro' | 'multigym_max' | 'individual' | 'pro' | 'max' | 'elite';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'frozen';

@Entity('subscriptions')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ length: 30, nullable: true, default: 'individual' })
  planType: PlanType;

  @Column()
  durationMonths: number;

  @Column({ type: 'date' })
  startDate: string;

  @Index()
  @Column({ type: 'date' })
  endDate: string;

  @Column({ length: 20, default: 'active' })
  status: SubscriptionStatus;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amountPaid: number;

  /** For gym_specific: the single gym this subscription covers */
  @Column({ type: 'uuid', array: true, default: [] })
  gymIds: string[];

  /** For gym_specific: reference to the gym-managed plan definition */
  @Column({ length: 255, nullable: true })
  gymPlanId: string;

  @Column({ type: 'uuid', nullable: true })
  corporateId: string;

  /** Cashfree order ID (named razorpay for legacy compat, stores cashfree id) */
  @Column({ length: 255, nullable: true })
  razorpayOrderId: string;

  @Column({ length: 255, nullable: true })
  razorpayPaymentId: string;

  @Column({ length: 50, nullable: true })
  invoiceNumber: string;

  @CreateDateColumn()
  createdAt: Date;
}
