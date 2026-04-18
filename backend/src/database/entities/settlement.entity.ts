import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type SettlementStatus = 'pending' | 'approved' | 'paid' | 'disputed';

@Entity('settlements')
@Index(['gymId', 'month'], { unique: true })
export class SettlementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  gymId: string;

  @Column({ length: 7 })
  month: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  commission: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  netPayout: number;

  @Column({ type: 'jsonb', default: {} })
  breakdown: {
    individualRevenue?: number;
    individualCommission?: number;
    individualPayout?: number;
    elitePoolShare?: number;
    proPoolShare?: number;
    corporatePoolShare?: number;
    ptRevenue?: number;
    checkinCount?: number;
    // Per-visit-day model fields
    billableDays?: number;
    ratePerDay?: number;
    multiGymGross?: number;
    multiGymCommission?: number;
    multiGymPayout?: number;
    totalCheckins?: number;
  };

  @Column({ length: 20, default: 'pending' })
  status: SettlementStatus;

  @Column({ type: 'timestamp', nullable: true })
  paidDate: Date;

  @Column({ type: 'text', nullable: true })
  disputeReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
