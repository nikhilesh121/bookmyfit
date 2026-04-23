import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type SessionKind = 'standard' | 'special';

/**
 * Defines what sessions a gym offers.
 * 'standard' = Gym Workout (auto-created, always available hourly)
 * 'special'  = Yoga, Zumba, HIIT, etc. — gym owner creates these
 */
@Entity('session_types')
export class SessionTypeEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) gymId: string;

  @Column({ length: 100 }) name: string;

  /** standard | special */
  @Column({ length: 20, default: 'special' }) kind: SessionKind;

  @Column({ type: 'text', nullable: true }) description: string;

  /** Duration in minutes e.g. 60 */
  @Column({ default: 60 }) durationMinutes: number;

  @Column({ default: 20 }) maxCapacity: number;

  /** Hex color for UI display e.g. "#3DFF54" */
  @Column({ length: 10, default: '#3DFF54' }) color: string;

  @Column({ length: 100, nullable: true }) instructor: string;

  @Column({ default: true }) isActive: boolean;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
