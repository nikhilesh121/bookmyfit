import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('gym_slots')
export class GymSlotEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() gymId: string;
  @Column() date: string; // YYYY-MM-DD
  @Column() startTime: string; // HH:MM
  @Column() endTime: string; // HH:MM
  @Column({ default: 20 }) capacity: number;
  @Column({ default: 0 }) booked: number;
  @Column({ default: 'active' }) status: string; // active | full | cancelled
  @CreateDateColumn() createdAt: Date;
}
