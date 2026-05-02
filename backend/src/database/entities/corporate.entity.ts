import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

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

  @OneToMany(() => CorporateEmployeeEntity, emp => emp.corporate, { createForeignKeyConstraints: false, eager: false })
  employees?: CorporateEmployeeEntity[];

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

  @ManyToOne(() => CorporateAccountEntity, { createForeignKeyConstraints: false, nullable: true, eager: false })
  @JoinColumn({ name: 'corporateId' })
  corporate?: CorporateAccountEntity;

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
