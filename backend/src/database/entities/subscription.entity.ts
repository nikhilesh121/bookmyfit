import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type PlanType = 'individual' | 'pro' | 'max' | 'elite';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'frozen';

@Entity('subscriptions')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ length: 20 })
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

  @Column({ type: 'uuid', array: true, default: [] })
  gymIds: string[];

  @Column({ type: 'uuid', nullable: true })
  corporateId: string;

  @Column({ length: 255, nullable: true })
  razorpayOrderId: string;

  @Column({ length: 255, nullable: true })
  razorpayPaymentId: string;

  @Column({ length: 50, nullable: true })
  invoiceNumber: string;

  @CreateDateColumn()
  createdAt: Date;
}
