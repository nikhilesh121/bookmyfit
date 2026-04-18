import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from './entities/user.entity';
import { GymEntity } from './entities/gym.entity';
import { ProductEntity } from './entities/store.entity';
import { CorporateAccountEntity } from './entities/corporate.entity';
import { WorkoutVideoEntity } from './entities/misc.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly log = new Logger('Seed');
  constructor(
    @InjectRepository(UserEntity) private users: Repository<UserEntity>,
    @InjectRepository(GymEntity) private gyms: Repository<GymEntity>,
    @InjectRepository(ProductEntity) private products: Repository<ProductEntity>,
    @InjectRepository(CorporateAccountEntity) private corps: Repository<CorporateAccountEntity>,
    @InjectRepository(WorkoutVideoEntity) private videos: Repository<WorkoutVideoEntity>,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.SEED_ON_BOOT === 'false') return;
    await this.seedUsers();
    await this.seedGyms();
    await this.seedProducts();
    await this.seedCorporates();
    await this.seedVideos();
    await this.linkGymOwner();
    this.log.log('Seed data ready');
  }

  private async seedUsers() {
    const seeds = [
      { email: 'admin@bookmyfit.in', phone: '9000000001', name: 'Super Admin', role: 'super_admin' as const, password: 'admin123' },
      { email: 'gym@bookmyfit.in', phone: '9000000002', name: 'Gym Owner', role: 'gym_owner' as const, password: 'gym123' },
      { email: 'staff@bookmyfit.in', phone: '9000000003', name: 'Gym Staff', role: 'gym_staff' as const, password: 'staff123' },
      { email: 'hr@techcorp.in', phone: '9000000004', name: 'HR Admin', role: 'corporate_admin' as const, password: 'hr123' },
    ];
    for (const u of seeds) {
      const existing = await this.users.findOne({ where: { email: u.email } });
      if (existing) continue;
      await this.users.save(this.users.create({
        email: u.email, phone: u.phone, name: u.name, role: u.role,
        passwordHash: await bcrypt.hash(u.password, 10),
      }));
      this.log.log(`Seeded user: ${u.email} / ${u.password}`);
    }
  }

  private async seedGyms() {
    if ((await this.gyms.count()) > 0) return;
    const gyms = [
      { name: 'PowerZone Fitness', city: 'Mumbai', area: 'Bandra West', address: 'Linking Rd, Bandra West, Mumbai', lat: 19.0596, lng: 72.8295, tier: 'corporate_exclusive' as const, rating: 4.8, ratingCount: 218, status: 'active' as const, commissionRate: 20, amenities: ['AC', 'Parking', 'Shower', 'Locker', 'Steam Room', 'Pool'], categories: ['Cardio', 'Weights', 'CrossFit'] },
      { name: 'FitHub Pro', city: 'Mumbai', area: 'Powai', address: 'Hiranandani, Powai, Mumbai', lat: 19.1176, lng: 72.9060, tier: 'premium' as const, rating: 4.6, ratingCount: 142, status: 'active' as const, commissionRate: 18, amenities: ['AC', 'Parking', 'Shower', 'Locker'], categories: ['Cardio', 'Weights'] },
      { name: 'IronBody Gym', city: 'Bangalore', area: 'HSR Layout', address: '27th Main, HSR Layout, Bangalore', lat: 12.9116, lng: 77.6383, tier: 'standard' as const, rating: 4.3, ratingCount: 87, status: 'active' as const, commissionRate: 15, amenities: ['Parking', 'Shower', 'Locker'], categories: ['Weights'] },
      { name: 'AquaFit Centre', city: 'Mumbai', area: 'Andheri West', address: 'Lokhandwala, Andheri W, Mumbai', lat: 19.1368, lng: 72.8301, tier: 'premium' as const, rating: 4.5, ratingCount: 96, status: 'active' as const, commissionRate: 18, amenities: ['AC', 'Parking', 'Pool', 'Shower', 'Locker'], categories: ['Pool', 'Cardio'] },
      { name: 'CrossTown Arena', city: 'Delhi', area: 'Saket', address: 'Select Citywalk, Saket, Delhi', lat: 28.5286, lng: 77.2196, tier: 'corporate_exclusive' as const, rating: 4.7, ratingCount: 184, status: 'active' as const, commissionRate: 20, amenities: ['AC', 'Parking', 'Shower', 'Locker', 'Sauna', 'CrossFit Zone'], categories: ['CrossFit', 'Weights', 'Cardio'] },
    ];
    await this.gyms.save(this.gyms.create(gyms));
    this.log.log(`Seeded ${gyms.length} gyms`);
  }

  private async seedProducts() {
    if ((await this.products.count()) > 0) return;
    const items = [
      { name: 'Whey Pro 2kg', category: 'supplements', price: 2199, mrp: 2999, stock: 50, images: ['https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400'], description: 'Premium whey protein isolate by MuscleBlaze' },
      { name: 'Pro Shaker Cup', category: 'accessories', price: 449, mrp: 599, stock: 120, images: ['https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400'], description: 'BPA-free shaker bottle by GNC Sports' },
      { name: 'Lifting Gloves', category: 'accessories', price: 799, mrp: 1199, stock: 80, images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400'], description: 'Padded training gloves by Harbinger' },
      { name: 'Resistance Band Set', category: 'equipment', price: 599, mrp: 899, stock: 60, images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'], description: '5-level resistance bands by Boldfit' },
      { name: 'BCAA 250g', category: 'supplements', price: 899, mrp: 1299, stock: 40, images: ['https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400'], description: 'Essential amino acid blend by AS-IT-IS' },
      { name: 'Training T-Shirt', category: 'apparel', price: 649, mrp: 999, stock: 150, images: ['https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400'], description: 'Dry-fit performance tee by Nivia Sports' },
    ];
    await this.products.save(this.products.create(items as any));
    this.log.log(`Seeded ${items.length} products`);
  }

  private async seedCorporates() {
    if ((await this.corps.count()) > 0) {
      // Link admin user if not already linked
      const corp = await this.corps.findOne({ where: { companyName: 'TechCorp India' } });
      if (corp && !corp.adminUserId) {
        const hrUser = await this.users.findOne({ where: { email: 'hr@techcorp.in' } });
        if (hrUser) {
          await this.corps.update(corp.id, { adminUserId: hrUser.id });
          this.log.log(`Linked corporate admin ${hrUser.email} to TechCorp India`);
        }
      }
      return;
    }
    const hrUser = await this.users.findOne({ where: { email: 'hr@techcorp.in' } });
    await this.corps.save(this.corps.create({
      companyName: 'TechCorp India', email: 'billing@techcorp.in',
      planType: 'elite', totalSeats: 150, assignedSeats: 0,
      billingContact: 'HR Finance · +91 9000000004',
      adminUserId: hrUser?.id,
    }));
    this.log.log('Seeded TechCorp India corporate account');
  }

  private async seedVideos() {
    if ((await this.videos.count()) > 0) return;
    const items = [
      { title: 'Full Body HIIT - 20 Min', category: 'hiit', thumbnailUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', durationSeconds: 1200, isPremium: false, description: 'Burn calories with this no-equipment full body HIIT session' },
      { title: 'Beginner Yoga Flow', category: 'yoga', thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', durationSeconds: 1800, isPremium: false, description: 'Morning yoga flow for beginners, 30 minutes' },
      { title: 'Advanced Chest & Triceps', category: 'strength', thumbnailUrl: 'https://images.unsplash.com/photo-1534368786749-b63e05c92717?w=400', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', durationSeconds: 2700, isPremium: true, description: 'Heavy compound movements for chest and tricep hypertrophy' },
      { title: 'Core Stability & Abs', category: 'strength', thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', durationSeconds: 900, isPremium: false, description: 'Build a strong core with this 15-min ab circuit' },
      { title: 'Zumba Dance Cardio', category: 'cardio', thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', durationSeconds: 1500, isPremium: false, description: 'Dance your way to fitness with upbeat Zumba' },
      { title: 'Elite Upper Body Split', category: 'strength', thumbnailUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', durationSeconds: 3600, isPremium: true, description: 'Pro-level upper body split for serious lifters' },
    ];
    await this.videos.save(this.videos.create(items as any));
    this.log.log(`Seeded ${items.length} workout videos`);
  }

  /** Link the seeded gym_owner user to PowerZone Fitness */
  private async linkGymOwner() {
    const owner = await this.users.findOne({ where: { email: 'gym@bookmyfit.in' } });
    if (!owner) return;
    const gym = await this.gyms.findOne({ where: { name: 'PowerZone Fitness' } });
    if (!gym) return;
    if (gym.ownerId === owner.id) return; // already linked
    await this.gyms.update(gym.id, { ownerId: owner.id });
    this.log.log(`Linked gym owner ${owner.email} to ${gym.name}`);
  }
}
