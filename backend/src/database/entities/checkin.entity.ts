import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type CheckinStatus = 'success' | 'failed_expired' | 'failed_invalid' | 'failed_daily_limit' | 'failed_device_mismatch';

@Entity('checkins')
@Index(['userId', 'checkinTime'])
@Index(['gymId', 'checkinTime'])
export class CheckinEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  gymId: string;

  @Column({ type: 'uuid' })
  subscriptionId: string;

  @CreateDateColumn()
  checkinTime: Date;

  @Index({ unique: true })
  @Column({ length: 500 })
  qrToken: string;

  @Column({ length: 30 })
  status: CheckinStatus;

  @Column({ length: 255, nullable: true })
  deviceId: string;

  @Column({ type: 'text', nullable: true })
  failReason: string;
}
