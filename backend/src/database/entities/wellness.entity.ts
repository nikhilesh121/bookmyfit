import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wellness_partners')
export class WellnessPartnerEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 200 }) name: string;
  @Column({ length: 50 }) serviceType: string; // yoga, physio, dietician, massage
  @Column({ length: 100 }) city: string;
  @Column({ length: 100 }) area: string;
  @Column({ type: 'text' }) address: string;
  @Column({ type: 'double precision' }) lat: number;
  @Column({ type: 'double precision' }) lng: number;
  @Column({ type: 'float', default: 30 }) commissionRate: number;
  @Column({ length: 20, default: 'pending' }) status: string;
  @Column({ type: 'text', array: true, default: [] }) photos: string[];
  @Column({ type: 'float', default: 0 }) rating: number;
  @Column({ type: 'uuid', nullable: true }) ownerId: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity('wellness_services')
export class WellnessServiceEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) partnerId: string;
  @Column({ length: 200 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) price: number;
  @Column() durationMinutes: number;
  @Column({ default: true }) isActive: boolean;
}

@Entity('wellness_bookings')
export class WellnessBookingEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @Index() @Column({ type: 'uuid' }) partnerId: string;
  @Column({ type: 'uuid' }) serviceId: string;
  @Column({ type: 'timestamptz' }) bookingDate: Date;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) amount: number;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) platformCommission: number;
  @Column({ length: 20, default: 'confirmed' }) status: string;
  @Column({ length: 255, nullable: true }) cashfreeOrderId: string;
  @CreateDateColumn() createdAt: Date;
}
