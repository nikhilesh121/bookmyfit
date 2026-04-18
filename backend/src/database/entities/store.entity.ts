import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 200 }) name: string;
  @Column({ length: 50 }) category: string; // supplements, accessories, apparel, equipment
  @Column({ type: 'numeric', precision: 10, scale: 2 }) price: number;
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true }) mrp: number;
  @Column({ default: 0 }) stock: number;
  @Column({ type: 'text', array: true, default: [] }) images: string[];
  @Column({ type: 'text' }) description: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'jsonb' }) items: Array<{ productId: string; quantity: number; price: number; name: string }>;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) subtotal: number;
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 }) shipping: number;
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 }) discount: number;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) totalAmount: number;
  @Column({ length: 20, default: 'pending' }) status: string;
  @Column({ type: 'jsonb', nullable: true }) shippingAddress: any;
  @Column({ length: 100, nullable: true }) trackingNumber: string;
  @Column({ length: 255, nullable: true }) cashfreeOrderId: string;
  @Column({ length: 50, nullable: true }) couponCode: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
