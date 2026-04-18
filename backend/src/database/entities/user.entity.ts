import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type UserRole = 'super_admin' | 'gym_owner' | 'gym_staff' | 'corporate_admin' | 'wellness_partner' | 'end_user';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true, where: '"phone" IS NOT NULL' })
  @Column({ length: 20, nullable: true })
  phone: string;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 255, nullable: true })
  passwordHash: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'date', nullable: true })
  dob: string;

  @Column({ length: 10, nullable: true })
  gender: string;

  @Column({ length: 30, default: 'end_user' })
  role: UserRole;

  @Column({ length: 255, nullable: true })
  deviceId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 20, nullable: true, unique: true })
  referralCode: string;

  @Column({ length: 20, nullable: true })
  referredBy: string;

  @Column({ type: 'int', default: 0 })
  loyaltyPoints: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
