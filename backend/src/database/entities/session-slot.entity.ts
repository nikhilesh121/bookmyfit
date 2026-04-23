import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type SlotStatus = 'scheduled' | 'full' | 'cancelled' | 'completed';

/**
 * Materialized slot instance for a specific date.
 * Generated nightly by cron from SessionSchedule rules.
 * Also auto-generated on-demand for Gym Workout (standard) slots.
 */
@Entity('session_slots')
@Index(['gymId', 'date'])
@Index(['sessionTypeId', 'date'])
export class SessionSlotEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) sessionTypeId: string;

  @Column({ type: 'uuid' }) gymId: string;

  /** YYYY-MM-DD */
  @Column({ length: 10 }) date: string;

  /** HH:MM */
  @Column({ length: 5 }) startTime: string;

  /** HH:MM */
  @Column({ length: 5 }) endTime: string;

  @Column({ default: 20 }) maxCapacity: number;

  @Column({ default: 0 }) bookedCount: number;

  /** scheduled | full | cancelled | completed */
  @Column({ length: 20, default: 'scheduled' }) status: SlotStatus;

  @CreateDateColumn() createdAt: Date;
}
