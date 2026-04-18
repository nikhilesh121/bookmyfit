import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('slot_bookings')
export class SlotBookingEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() slotId: string;
  @Column() userId: string;
  @Column() gymId: string;
  @Column({ default: 'confirmed' }) status: string; // confirmed | cancelled
  @CreateDateColumn() createdAt: Date;
}
