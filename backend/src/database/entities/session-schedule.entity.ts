import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Recurring schedule rule for a session type.
 * The nightly cron reads these rules and materializes SessionSlot records
 * for the next 30 days.
 */
@Entity('session_schedules')
export class SessionScheduleEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) sessionTypeId: string;

  @Column({ type: 'uuid' }) gymId: string;

  /**
   * JSON array of day indices (0=Mon…6=Sun).
   * e.g. [0,1,2,3,4] = Mon–Fri, [0,1,2,3,4,5,6] = every day
   */
  @Column({ type: 'simple-array' }) daysOfWeek: number[];

  /** HH:MM start time e.g. "07:00" */
  @Column({ length: 5 }) startTime: string;

  /** HH:MM end time e.g. "08:00" */
  @Column({ length: 5 }) endTime: string;

  @Column({ default: true }) isActive: boolean;

  /** Optional: null means valid forever */
  @Column({ type: 'date', nullable: true }) validFrom: string;
  @Column({ type: 'date', nullable: true }) validUntil: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
