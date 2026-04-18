import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('corporate_accounts')
export class CorporateAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 200 })
  companyName: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ length: 20 })
  planType: string;

  @Column({ default: 0 })
  totalSeats: number;

  @Column({ default: 0 })
  assignedSeats: number;

  @Column({ length: 255 })
  billingContact: string;

  @Column({ type: 'uuid', nullable: true })
  adminUserId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('corporate_employees')
@Index(['corporateId', 'userId'], { unique: true })
export class CorporateEmployeeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  corporateId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ length: 50 })
  employeeCode: string;

  @Column({ length: 100, nullable: true })
  department: string;

  @Column({ length: 20, default: 'active' })
  status: string;

  @CreateDateColumn()
  assignedDate: Date;
}
