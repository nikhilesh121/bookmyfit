import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('fraud_alerts')
export class FraudAlertEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) userId: string;
  @Column({ nullable: true }) eventType: string; // 'velocity_check', 'duplicate_qr', 'device_mismatch'
  @Column({ nullable: true }) gymId: string;
  @Column({ nullable: true }) gymName: string;
  @Column({ type: 'int', default: 50 }) riskScore: number;
  @Column({ nullable: true }) device: string;
  @Column({ nullable: true }) details: string;
  @Column({ default: 'open' }) status: string; // 'open', 'investigating', 'cleared'
  @CreateDateColumn() createdAt: Date;
}

@Entity('ratings')
export class RatingEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'uuid', nullable: true }) gymId: string;
  @Column({ type: 'uuid', nullable: true }) trainerId: string;
  @Column({ type: 'uuid', nullable: true }) wellnessPartnerId: string;
  @Column({ type: 'smallint' }) stars: number;
  @Column({ type: 'text', nullable: true }) review: string;
  @Column({ length: 20, default: 'pending' }) status: string; // pending, approved, rejected
  @CreateDateColumn() createdAt: Date;
}

@Entity('coupons')
export class CouponEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 50 }) code: string;
  @Column({ length: 20 }) discountType: string; // percentage, flat
  @Column({ type: 'numeric', precision: 10, scale: 2 }) discountValue: number;
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 }) minOrderValue: number;
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true }) maxDiscount: number;
  @Column({ type: 'timestamptz' }) validFrom: Date;
  @Column({ type: 'timestamptz' }) validTo: Date;
  @Column({ default: 0 }) usageLimit: number; // 0 = unlimited
  @Column({ default: 1 }) perUserLimit: number;
  @Column({ default: 0 }) usedCount: number;
  @Column({ type: 'text', array: true, default: [] }) applicableTo: string[]; // subscription, pt, wellness, store
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'text' }) body: string;
  @Column({ length: 50 }) type: string;
  @Column({ type: 'jsonb', default: {} }) data: any;
  @Column({ default: false }) isRead: boolean;
  @CreateDateColumn() createdAt: Date;
}

@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 100 }) name: string;
  @Column({ length: 255, nullable: true }) iconUrl: string;
  @Column({ default: true }) isActive: boolean;
}

@Entity('amenities')
export class AmenityEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 100 }) name: string;
  @Column({ length: 255, nullable: true }) iconUrl: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ default: false }) requestedByGym: boolean;
  @Column({ length: 20, default: 'approved' }) status: string;
}

@Entity('workout_videos')
export class WorkoutVideoEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ length: 100 }) category: string;
  @Column({ length: 500 }) videoUrl: string;
  @Column({ length: 500, nullable: true }) thumbnailUrl: string;
  @Column() durationSeconds: number;
  @Column({ default: false }) isPremium: boolean;
  @CreateDateColumn() createdAt: Date;
}
