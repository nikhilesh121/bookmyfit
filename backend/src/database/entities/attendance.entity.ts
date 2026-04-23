import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * One record per attended visit.
 * This is the billing unit — admin pays gyms per Attendance record.
 * Linked to SessionBooking and eventually to a SettlementEntity.
 */
@Entity('attendance')
@Index(['gymId', 'sessionDate'])
@Index(['userId', 'sessionDate'])
export class AttendanceEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) bookingId: string;

  @Column({ type: 'uuid' }) gymId: string;

  @Column({ type: 'uuid' }) userId: string;

  @Column({ type: 'uuid', nullable: true }) subscriptionId: string;

  /** YYYY-MM-DD */
  @Column({ length: 10 }) sessionDate: string;

  /** Session type name for reporting e.g. "Gym Workout", "Yoga" */
  @Column({ length: 100 }) sessionTypeName: string;

  /** standard | special */
  @Column({ length: 20 }) sessionKind: string;

  @Column({ type: 'timestamp' }) checkinAt: Date;

  /** Flat per-attendance commission owed to the gym — set from platform config */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) commissionAmount: number;

  /** Filled when this attendance is included in a settlement run */
  @Column({ type: 'uuid', nullable: true }) settlementId: string;

  @CreateDateColumn() createdAt: Date;
}
