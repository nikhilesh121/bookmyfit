import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { GymEntity } from './gym.entity';

export type CheckinStatus = 'success' | 'failed_expired' | 'failed_invalid' | 'failed_daily_limit' | 'failed_device_mismatch';

@Entity('checkins')
@Index(['userId', 'checkinTime'])
@Index(['gymId', 'checkinTime'])
export class CheckinEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false, nullable: true, eager: false })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @Column({ type: 'uuid' })
  gymId: string;

  @ManyToOne(() => GymEntity, { createForeignKeyConstraints: false, nullable: true, eager: false })
  @JoinColumn({ name: 'gymId' })
  gym?: GymEntity;

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
