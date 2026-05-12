import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('trainers')
export class TrainerEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) gymId: string;
  @Column({ length: 150 }) name: string;
  @Column({ length: 255, nullable: true }) specialization: string;
  @Column({ length: 500, nullable: true }) photoUrl: string;
  @Column({ length: 1000, nullable: true }) bio: string;
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 }) monthlyPrice: number;
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 }) pricePerSession: number;
  @Column({ type: 'jsonb', default: [] }) sessionPackages: Array<{ sessions: number; price: number }>;
  @Column({ type: 'float', default: 0 }) rating: number;
  @Column({ default: 0 }) ratingCount: number;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}

@Entity('trainer_bookings')
export class TrainerBookingEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @Index() @Column({ type: 'uuid' }) trainerId: string;
  @Column({ type: 'uuid' }) gymId: string;
  @Column({ type: 'timestamptz' }) sessionDate: Date;
  @Column({ default: 1 }) durationMonths: number;
  @Column({ default: 1 }) sessions: number;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) amount: number;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) platformCommission: number;
  @Column({ length: 20, default: 'confirmed' }) status: string;
  @Column({ length: 255, nullable: true }) cashfreeOrderId: string;
  @CreateDateColumn() createdAt: Date;
}
