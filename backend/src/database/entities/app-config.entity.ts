import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Generic key-value config store for admin-managed settings.
 * Values are stored as JSONB so they can hold any shape.
 */
@Entity('app_config')
export class AppConfigEntity {
  @PrimaryColumn({ length: 100 })
  key: string;

  @Column({ type: 'jsonb' })
  value: any;

  @UpdateDateColumn()
  updatedAt: Date;
}
