import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('booking_qrs')
export class BookingQrEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'uuid' }) gymId: string;
  @Column({ type: 'uuid' }) subscriptionId: string;
  @Column({ type: 'uuid', nullable: true }) slotBookingId: string;
  @Column({ type: 'text' }) qrToken: string;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) usedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) bookedAt: Date;
  @CreateDateColumn() createdAt: Date;
}
