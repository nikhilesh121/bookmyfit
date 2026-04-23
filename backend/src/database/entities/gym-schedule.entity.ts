import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Stores operating hours for each gym per day of the week.
 * dayOfWeek: 0=Monday … 6=Sunday
 */
@Entity('gym_schedules')
@Index(['gymId', 'dayOfWeek'], { unique: true })
export class GymScheduleEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) gymId: string;

  /** 0=Monday, 1=Tuesday, ..., 6=Sunday */
  @Column({ type: 'smallint' }) dayOfWeek: number;

  @Column({ default: true }) isOpen: boolean;

  /** HH:MM 24-hour e.g. "06:00" */
  @Column({ length: 5, default: '06:00' }) openTime: string;

  /** HH:MM 24-hour e.g. "22:00" */
  @Column({ length: 5, default: '22:00' }) closeTime: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
