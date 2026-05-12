const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_URL = 'postgresql://neondb_owner:npg_SrIJBy3pT2fl@ep-falling-poetry-amk6paog-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function seed() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('Connected to DB');

  const hash = await bcrypt.hash('password123', 10);

  // ─── 1. END USERS (33) ───────────────────────────────────────────────────
  const users = [
    { phone: '9876543210', name: 'Rahul Sharma', email: 'rahul@example.com' },
    { phone: '9876543211', name: 'Priya Patel', email: 'priya@example.com' },
    { phone: '9876543212', name: 'Amit Verma', email: 'amit@example.com' },
    { phone: '9876543213', name: 'Sneha Nair', email: 'sneha@example.com' },
    { phone: '9876543214', name: 'Vikram Singh', email: 'vikram@example.com' },
    { phone: '9876543215', name: 'Kavya Reddy', email: 'kavya@example.com' },
    { phone: '9876543216', name: 'Rohit Gupta', email: 'rohit@example.com' },
    { phone: '9876543217', name: 'Anjali Mehra', email: 'anjali@example.com' },
    { phone: '9876543218', name: 'Suresh Kumar', email: 'suresh@example.com' },
    { phone: '9876543219', name: 'Deepika Joshi', email: 'deepika@example.com' },
    { phone: '9876543220', name: 'Arun Pillai', email: 'arun@example.com' },
    { phone: '9876543221', name: 'Meera Bhat', email: 'meera@example.com' },
    { phone: '9876543222', name: 'Kiran Rao', email: 'kiran@example.com' },
    { phone: '9876543223', name: 'Pooja Iyer', email: 'pooja@example.com' },
    { phone: '9876543224', name: 'Sanjay Mishra', email: 'sanjay@example.com' },
    { phone: '9876543225', name: 'Ritu Saxena', email: 'ritu@example.com' },
    { phone: '9876543226', name: 'Nitin Desai', email: 'nitin@example.com' },
    { phone: '9876543227', name: 'Swati Kulkarni', email: 'swati@example.com' },
    { phone: '9876543228', name: 'Manoj Tiwari', email: 'manoj@example.com' },
    { phone: '9876543229', name: 'Gayatri Menon', email: 'gayatri@example.com' },
    { phone: '9876543230', name: 'Varun Kapoor', email: 'varun@example.com' },
    { phone: '9876543231', name: 'Shilpa Das', email: 'shilpa@example.com' },
    { phone: '9876543232', name: 'Rajesh Babu', email: 'rajesh@example.com' },
    { phone: '9876543233', name: 'Nisha Agarwal', email: 'nisha@example.com' },
    { phone: '9876543234', name: 'Prasad Naik', email: 'prasad@example.com' },
    { phone: '9876543235', name: 'Lakshmi Subramaniam', email: 'lakshmi@example.com' },
    { phone: '9876543236', name: 'Arjun Pandey', email: 'arjun@example.com' },
    { phone: '9876543237', name: 'Divya Sharma', email: 'divya@example.com' },
    { phone: '9876543238', name: 'Manish Yadav', email: 'manish@example.com' },
    { phone: '9876543239', name: 'Preethi Pillai', email: 'preethi@example.com' },
    { phone: '9876543240', name: 'Sandeep Nair', email: 'sandeep@example.com' },
    { phone: '9876543241', name: 'Ananya Bose', email: 'ananya@example.com' },
    { phone: '9876543242', name: 'Vijay Krishnan', email: 'vijay@example.com' },
  ];

  const userIds = {};
  for (const u of users) {
    const id = uuidv4();
    await client.query(
      `INSERT INTO users (id, phone, email, name, role, "passwordHash", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,'end_user',$5,NOW(),NOW())
       ON CONFLICT (phone) DO UPDATE SET name=EXCLUDED.name`,
      [id, u.phone, u.email, u.name, hash]
    );
    const res = await client.query(`SELECT id FROM users WHERE phone=$1`, [u.phone]);
    userIds[u.phone] = res.rows[0].id;
    process.stdout.write('.');
  }
  console.log('\n✓ ' + users.length + ' users seeded');

  // ─── 2. CORPORATE ADMINS ──────────────────────────────────────────────────
  const corpAdmins = [
    { phone: '9000000010', email: 'hr@infosys.com', name: 'Suresh HR', company: 'Infosys Ltd', pass: 'infosys123' },
    { phone: '9000000011', email: 'hr@wipro.com', name: 'Priya HR', company: 'Wipro Technologies', pass: 'wipro123' },
    { phone: '9000000012', email: 'hr@tcs.com', name: 'Raj HR', company: 'TCS India', pass: 'tcs123' },
    { phone: '9000000013', email: 'admin@mahindra.com', name: 'Neha Admin', company: 'Mahindra Group', pass: 'mahindra123' },
    { phone: '9000000014', email: 'wellness@flipkart.com', name: 'Amit Wellness', company: 'Flipkart', pass: 'flipkart123' },
    { phone: '9000000015', email: 'hr@amazon.in', name: 'Sunita HR', company: 'Amazon India', pass: 'amazon123' },
    { phone: '9000000016', email: 'wellness@accenture.com', name: 'Ravi Wellness', company: 'Accenture India', pass: 'accenture123' },
  ];
  const corpAdminIds = {};
  for (const ca of corpAdmins) {
    const h = await bcrypt.hash(ca.pass, 10);
    const id = uuidv4();
    await client.query(
      `INSERT INTO users (id, phone, email, name, role, "passwordHash", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,'corporate_admin',$5,NOW(),NOW())
       ON CONFLICT (phone) DO UPDATE SET name=EXCLUDED.name`,
      [id, ca.phone, ca.email, ca.name, h]
    );
    const res = await client.query(`SELECT id FROM users WHERE phone=$1`, [ca.phone]);
    corpAdminIds[ca.company] = res.rows[0].id;
    process.stdout.write('a');
  }
  console.log('\n✓ ' + corpAdmins.length + ' corporate admins seeded');

  // ─── 3. EXTRA GYMS (25+) ──────────────────────────────────────────────────
  const gymOwnerRes = await client.query(`SELECT id FROM users WHERE email='gym@bookmyfit.in'`);
  const ownerUserId = gymOwnerRes.rows[0] ? gymOwnerRes.rows[0].id : null;

  const extraGyms = [
    { name: 'FitLife Studio', city: 'Bangalore', area: 'Koramangala', address: '80 Feet Rd, Koramangala', lat: 12.9347, lng: 77.6205, tier: 'premium', rating: 4.5, ratingCount: 132, status: 'active', commissionRate: 18 },
    { name: 'Muscle Factory', city: 'Mumbai', area: 'Kurla', address: 'LBS Marg, Kurla West', lat: 19.0728, lng: 72.8826, tier: 'standard', rating: 4.2, ratingCount: 67, status: 'active', commissionRate: 15 },
    { name: 'ZenFit Wellness', city: 'Pune', area: 'Kalyani Nagar', address: 'North Main Rd, Kalyani Nagar', lat: 18.5515, lng: 73.9049, tier: 'premium', rating: 4.6, ratingCount: 89, status: 'active', commissionRate: 18 },
    { name: 'Strength Forge', city: 'Hyderabad', area: 'Banjara Hills', address: 'Road No. 12, Banjara Hills', lat: 17.4123, lng: 78.4530, tier: 'corporate_exclusive', rating: 4.7, ratingCount: 201, status: 'active', commissionRate: 20 },
    { name: 'CardioZone', city: 'Chennai', area: 'Anna Nagar', address: '2nd Avenue, Anna Nagar', lat: 13.0850, lng: 80.2101, tier: 'standard', rating: 4.1, ratingCount: 54, status: 'active', commissionRate: 15 },
    { name: 'Peak Performance', city: 'Delhi', area: 'Connaught Place', address: 'Inner Circle, CP', lat: 28.6329, lng: 77.2195, tier: 'premium', rating: 4.4, ratingCount: 178, status: 'active', commissionRate: 18 },
    { name: 'Flex Hub', city: 'Bangalore', area: 'Whitefield', address: 'EPIP Zone, Whitefield', lat: 12.9716, lng: 77.7480, tier: 'standard', rating: 4.0, ratingCount: 43, status: 'active', commissionRate: 15 },
    { name: 'EliteFit Club', city: 'Gurgaon', area: 'DLF Phase 5', address: 'Golf Course Rd, DLF Phase 5', lat: 28.4390, lng: 77.1020, tier: 'corporate_exclusive', rating: 4.8, ratingCount: 312, status: 'active', commissionRate: 20 },
    { name: 'ProActive Gym', city: 'Pune', area: 'Viman Nagar', address: 'Porwal Rd, Viman Nagar', lat: 18.5679, lng: 73.9143, tier: 'premium', rating: 4.3, ratingCount: 76, status: 'active', commissionRate: 18 },
    { name: 'CrossFire Training', city: 'Mumbai', area: 'Lower Parel', address: 'Trade World, Lower Parel', lat: 18.9932, lng: 72.8289, tier: 'corporate_exclusive', rating: 4.9, ratingCount: 267, status: 'active', commissionRate: 20 },
    { name: 'Sweat Lab', city: 'Hyderabad', area: 'Gachibowli', address: 'Financial District, Gachibowli', lat: 17.4401, lng: 78.3489, tier: 'premium', rating: 4.5, ratingCount: 144, status: 'active', commissionRate: 18 },
    { name: 'BodyWorks Gym', city: 'Chennai', area: 'Velachery', address: 'Grand Southern Trunk Rd', lat: 12.9781, lng: 80.2203, tier: 'standard', rating: 4.0, ratingCount: 38, status: 'active', commissionRate: 15 },
    { name: 'NuFit Arena', city: 'Kolkata', area: 'Salt Lake', address: 'Sector V, Salt Lake', lat: 22.5726, lng: 88.4312, tier: 'premium', rating: 4.3, ratingCount: 92, status: 'active', commissionRate: 18 },
    { name: 'ActivePulse', city: 'Delhi', area: 'Dwarka', address: 'Sector 10, Dwarka', lat: 28.5921, lng: 77.0460, tier: 'standard', rating: 4.1, ratingCount: 61, status: 'active', commissionRate: 15 },
    { name: 'IronCore Studio', city: 'Gurgaon', area: 'Sohna Road', address: 'Vatika City, Sohna Rd', lat: 28.4142, lng: 77.0356, tier: 'premium', rating: 4.4, ratingCount: 108, status: 'active', commissionRate: 18 },
    { name: 'MaxForce Gym', city: 'Bangalore', area: 'Indiranagar', address: '100 Feet Rd, Indiranagar', lat: 12.9784, lng: 77.6408, tier: 'corporate_exclusive', rating: 4.7, ratingCount: 189, status: 'active', commissionRate: 20 },
    { name: 'FitStation Noida', city: 'Noida', area: 'Sector 62', address: 'B Block, Sector 62', lat: 28.6239, lng: 77.3629, tier: 'standard', rating: 3.9, ratingCount: 29, status: 'active', commissionRate: 15 },
    { name: 'Pulse Fitness', city: 'Ahmedabad', area: 'SG Highway', address: 'Prahlad Nagar, SG Hwy', lat: 23.0225, lng: 72.5714, tier: 'premium', rating: 4.2, ratingCount: 71, status: 'active', commissionRate: 18 },
    { name: 'GritBox CrossFit', city: 'Mumbai', area: 'Malad West', address: 'Mindspace, Malad West', lat: 19.1858, lng: 72.8488, tier: 'standard', rating: 4.3, ratingCount: 58, status: 'active', commissionRate: 15 },
    { name: 'Vitality Club', city: 'Bangalore', area: 'Electronic City', address: 'Phase 1, Electronic City', lat: 12.8441, lng: 77.6611, tier: 'premium', rating: 4.4, ratingCount: 83, status: 'active', commissionRate: 18 },
    { name: 'AeroFit Jaipur', city: 'Jaipur', area: 'Vaishali Nagar', address: 'Queens Rd, Vaishali', lat: 26.9124, lng: 75.7873, tier: 'standard', rating: 4.0, ratingCount: 47, status: 'active', commissionRate: 15 },
    { name: 'BeFit Studio', city: 'Pune', area: 'Aundh', address: 'DP Rd, Aundh', lat: 18.5578, lng: 73.8080, tier: 'standard', rating: 4.1, ratingCount: 52, status: 'active', commissionRate: 15 },
    { name: 'HardCore Gym', city: 'Kolkata', area: 'Park Street', address: 'Park St, Kolkata', lat: 22.5520, lng: 88.3593, tier: 'premium', rating: 4.5, ratingCount: 119, status: 'active', commissionRate: 18 },
    { name: 'TurboFit Delhi', city: 'Delhi', area: 'Rajouri Garden', address: 'Ring Rd, Rajouri Garden', lat: 28.6476, lng: 77.1207, tier: 'standard', rating: 3.8, ratingCount: 24, status: 'active', commissionRate: 15 },
    { name: 'PrimeFit Club', city: 'Hyderabad', area: 'Madhapur', address: 'Hi-Tech City, Madhapur', lat: 17.4474, lng: 78.3762, tier: 'corporate_exclusive', rating: 4.6, ratingCount: 156, status: 'active', commissionRate: 20 },
  ];

  const amenitiesJson = JSON.stringify(['AC','Parking','Shower','Locker']);
  const catsJson = JSON.stringify(['Cardio','Weights']);
  const gymIds = [];
  for (const g of extraGyms) {
    const existing = await client.query(`SELECT id FROM gyms WHERE name=$1`, [g.name]);
    if (existing.rows.length > 0) { gymIds.push(existing.rows[0].id); continue; }
    const id = uuidv4();
    await client.query(
      `INSERT INTO gyms (id, name, city, area, address, lat, lng, tier, rating, "ratingCount", status, "commissionRate", amenities, categories, "ownerId", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::text[],$14::text[],$15,NOW(),NOW())
       ON CONFLICT DO NOTHING`,
      [id, g.name, g.city, g.area, g.address, g.lat, g.lng, g.tier, g.rating, g.ratingCount, g.status, g.commissionRate,
       ['AC','Parking','Shower','Locker'], ['Cardio','Weights'], ownerUserId]
    );
    gymIds.push(id);
    process.stdout.write('g');
  }
  console.log('\n✓ ' + extraGyms.length + ' extra gyms seeded');

  // Get all active gym IDs
  const allGymsRes = await client.query(`SELECT id FROM gyms WHERE status='active' LIMIT 30`);
  const allGymIds = allGymsRes.rows.map(r => r.id);

  // ─── 4. SUBSCRIPTIONS ────────────────────────────────────────────────────
  const plans = ['individual','pro','max','elite'];
  const amounts = { individual: 1999, pro: 3999, max: 6999, elite: 9999 };
  const phoneList = Object.keys(userIds);
  let subCount = 0;
  for (let i = 0; i < phoneList.length; i++) {
    const uid = userIds[phoneList[i]];
    const plan = plans[i % plans.length];
    let gymSlice;
    if (plan === 'individual') gymSlice = [allGymIds[i % allGymIds.length]];
    else if (plan === 'pro') gymSlice = allGymIds.slice(i % 5, (i % 5) + 3);
    else gymSlice = allGymIds.slice(0, 5);
    const daysAgo = (i * 7 + 5) * 86400000;
    const startDate = new Date(Date.now() - daysAgo);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3);
    const status = i > 28 ? 'expired' : 'active';
    const id = uuidv4();
    await client.query(
      `INSERT INTO subscriptions (id, "userId", "planType", "gymIds", "durationMonths", "startDate", "endDate", status, "amountPaid", "razorpayOrderId", "createdAt")
       VALUES ($1,$2,$3,$4::uuid[],$5,$6,$7,$8,$9,$10,NOW())
       ON CONFLICT DO NOTHING`,
      [id, uid, plan, gymSlice, 3, startDate.toISOString().slice(0,10), endDate.toISOString().slice(0,10),
       status, amounts[plan], 'ORDER-SEED-' + i]
    );
    subCount++;
    process.stdout.write('s');
  }
  console.log('\n✓ ' + subCount + ' subscriptions seeded');

  // ─── 5. CORPORATE ACCOUNTS ────────────────────────────────────────────────
  const corps = [
    { companyName: 'Infosys Ltd', email: 'billing@infosys.com', planType: 'elite', totalSeats: 500, company: 'Infosys Ltd' },
    { companyName: 'Wipro Technologies', email: 'billing@wipro.com', planType: 'max', totalSeats: 300, company: 'Wipro Technologies' },
    { companyName: 'TCS India', email: 'billing@tcs.com', planType: 'elite', totalSeats: 800, company: 'TCS India' },
    { companyName: 'Mahindra Group', email: 'billing@mahindra.com', planType: 'pro', totalSeats: 200, company: 'Mahindra Group' },
    { companyName: 'Flipkart', email: 'billing@flipkart.com', planType: 'max', totalSeats: 400, company: 'Flipkart' },
    { companyName: 'Amazon India', email: 'billing@amazon.in', planType: 'elite', totalSeats: 600, company: 'Amazon India' },
    { companyName: 'Accenture India', email: 'billing@accenture.com', planType: 'pro', totalSeats: 250, company: 'Accenture India' },
  ];
  const corpIds = {};
  for (const c of corps) {
    const existing = await client.query(`SELECT id FROM corporate_accounts WHERE "companyName"=$1`, [c.companyName]);
    if (existing.rows.length > 0) { corpIds[c.companyName] = existing.rows[0].id; continue; }
    const id = uuidv4();
    const adminId = corpAdminIds[c.company] || null;
    await client.query(
      `INSERT INTO corporate_accounts (id, "companyName", email, "planType", "totalSeats", "assignedSeats", "billingContact", "adminUserId", "isActive", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW())
       ON CONFLICT ("companyName") DO NOTHING`,
      [id, c.companyName, c.email, c.planType, c.totalSeats, Math.floor(Math.random()*80)+20, 'Finance Dept', adminId]
    );
    corpIds[c.companyName] = id;
    process.stdout.write('c');
  }
  console.log('\n✓ ' + corps.length + ' corporate accounts seeded');

  // ─── 6. CORPORATE EMPLOYEES ───────────────────────────────────────────────
  const depts = ['Engineering','HR','Finance','Marketing','Sales','Operations','Product','Design'];
  const allCorpIdList = Object.values(corpIds);
  let empCount = 0;
  for (let i = 0; i < phoneList.length; i++) {
    const uid = userIds[phoneList[i]];
    const corpId = allCorpIdList[i % allCorpIdList.length];
    if (!corpId) continue;
    await client.query(
      `INSERT INTO corporate_employees (id, "corporateId", "userId", "employeeCode", department, status, "assignedDate")
       VALUES ($1,$2,$3,$4,$5,'active',NOW())
       ON CONFLICT ("corporateId","userId") DO NOTHING`,
      [uuidv4(), corpId, uid, 'EMP' + String(1000+i), depts[i % depts.length]]
    );
    empCount++;
    process.stdout.write('e');
  }
  console.log('\n✓ ' + empCount + ' corporate employees seeded');

  // ─── 7. PRODUCTS (25) ────────────────────────────────────────────────────
  const products = [
    { name: 'Whey Protein Isolate 2kg', category: 'supplements', price: 2999, mrp: 3999, stock: 150, description: 'Premium whey isolate. 25g protein per serving.', img: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400' },
    { name: 'Creatine Monohydrate 500g', category: 'supplements', price: 899, mrp: 1299, stock: 200, description: 'Micronized creatine for strength and power.', img: 'https://images.unsplash.com/photo-1612356060822-50b993c3a948?w=400' },
    { name: 'BCAA Energy Drink 250g', category: 'supplements', price: 1199, mrp: 1599, stock: 180, description: '2:1:1 BCAA ratio with electrolytes for endurance.', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
    { name: 'Mass Gainer 5kg', category: 'supplements', price: 3499, mrp: 4499, stock: 80, description: 'High calorie mass gainer with 1250 kcal per serving.', img: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400' },
    { name: 'Pre-Workout Explosive 300g', category: 'supplements', price: 1499, mrp: 1999, stock: 120, description: 'Explosive pre-workout with caffeine and beta-alanine.', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
    { name: 'Resistance Bands Set (5 bands)', category: 'equipment', price: 699, mrp: 999, stock: 300, description: 'Set of 5 resistance bands for home workouts.', img: 'https://images.unsplash.com/photo-1598632640487-6ea4a4e8b963?w=400' },
    { name: 'Foam Roller - Deep Tissue', category: 'equipment', price: 899, mrp: 1299, stock: 150, description: 'High density foam roller for myofascial release.', img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },
    { name: 'Gym Gloves - Grip Pro', category: 'accessories', price: 499, mrp: 799, stock: 400, description: 'Anti-slip gym gloves with wrist support.', img: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400' },
    { name: 'Shaker Bottle 700ml', category: 'accessories', price: 349, mrp: 499, stock: 500, description: 'Leak-proof protein shaker with BlenderBall.', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
    { name: 'Yoga Mat - 6mm Premium', category: 'equipment', price: 1299, mrp: 1799, stock: 100, description: 'Non-slip eco-friendly TPE yoga mat.', img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400' },
    { name: 'Adjustable Dumbbell 10kg', category: 'equipment', price: 3999, mrp: 5499, stock: 50, description: 'Space-saving adjustable dumbbell 2.5kg to 10kg.', img: 'https://images.unsplash.com/photo-1534368786749-b63e05c92717?w=400' },
    { name: 'Gym Bag - Duffle Pro', category: 'accessories', price: 1799, mrp: 2499, stock: 90, description: 'Spacious duffle bag with wet pouch and shoe compartment.', img: 'https://images.unsplash.com/photo-1547941126-3d5322b218b0?w=400' },
    { name: 'Compression Shorts', category: 'apparel', price: 899, mrp: 1299, stock: 200, description: 'Moisture-wicking compression shorts. Sizes S-XXL.', img: 'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400' },
    { name: 'Sports Bra - High Impact', category: 'apparel', price: 1099, mrp: 1599, stock: 180, description: 'Full coverage high-impact sports bra.', img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400' },
    { name: 'Dry Fit T-Shirt', category: 'apparel', price: 599, mrp: 899, stock: 350, description: 'Lightweight quick-dry performance t-shirt.', img: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400' },
    { name: 'Jump Rope - Speed Pro', category: 'equipment', price: 499, mrp: 799, stock: 250, description: 'Ball bearing speed rope for cardio.', img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },
    { name: 'Pull-Up Bar - Doorframe', category: 'equipment', price: 1499, mrp: 2199, stock: 70, description: 'No-drill doorframe pull-up bar, 150kg capacity.', img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400' },
    { name: 'Electrolyte Powder 500g', category: 'supplements', price: 799, mrp: 1099, stock: 160, description: 'Hydration mix with sodium, potassium, magnesium.', img: 'https://images.unsplash.com/photo-1612356060822-50b993c3a948?w=400' },
    { name: 'Gym Knee Sleeves (pair)', category: 'accessories', price: 1299, mrp: 1899, stock: 120, description: '7mm neoprene knee sleeves for squats.', img: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400' },
    { name: 'Workout Leggings - High Waist', category: 'apparel', price: 1499, mrp: 2199, stock: 140, description: 'High waist squat-proof leggings with hidden pocket.', img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400' },
    { name: 'Fat Burner Capsules 60ct', category: 'supplements', price: 1199, mrp: 1699, stock: 90, description: 'Thermogenic fat burner with green tea and L-carnitine.', img: 'https://images.unsplash.com/photo-1612356060822-50b993c3a948?w=400' },
    { name: 'Wrist Wraps - Heavy Duty', category: 'accessories', price: 799, mrp: 1199, stock: 200, description: 'Stiff wrist wraps for pressing movements.', img: 'https://images.unsplash.com/photo-1598632640487-6ea4a4e8b963?w=400' },
    { name: 'Massage Gun - Recovery Pro', category: 'equipment', price: 4999, mrp: 7999, stock: 40, description: 'Percussive therapy device with 6 attachments.', img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },
    { name: 'Protein Bar Box (12 bars)', category: 'supplements', price: 1099, mrp: 1499, stock: 250, description: '20g protein per bar, low sugar. Chocolate brownie.', img: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400' },
    { name: 'Ab Roller Wheel', category: 'equipment', price: 399, mrp: 599, stock: 300, description: 'Dual-wheel ab roller with non-slip handles.', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
  ];
  for (const p of products) {
    await client.query(
      `INSERT INTO products (id, name, category, price, mrp, stock, images, description, "isActive", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7::text[],$8,true,NOW(),NOW())
       ON CONFLICT DO NOTHING`,
      [uuidv4(), p.name, p.category, p.price, p.mrp, p.stock, [p.img], p.description]
    );
    process.stdout.write('p');
  }
  console.log('\n✓ ' + products.length + ' products seeded');

  // ─── 8. ORDERS (25) ───────────────────────────────────────────────────────
  const allProductsRes = await client.query(`SELECT id, name, price FROM products LIMIT 25`);
  const pList = allProductsRes.rows;
  const orderStatuses = ['delivered','processing','shipped','pending','cancelled'];
  let ordCount = 0;
  for (let i = 0; i < 25; i++) {
    const uid = userIds[phoneList[i % phoneList.length]];
    const p = pList[i % pList.length];
    const qty = (i % 3) + 1;
    const subtotal = p.price * qty;
    await client.query(
      `INSERT INTO orders (id, "userId", items, subtotal, shipping, discount, "totalAmount", status, "createdAt", "updatedAt")
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,NOW(),NOW())
       ON CONFLICT DO NOTHING`,
      [uuidv4(), uid, JSON.stringify([{ productId: p.id, name: p.name, quantity: qty, price: p.price }]),
       subtotal, 99, 0, subtotal + 99, orderStatuses[i % orderStatuses.length]]
    );
    ordCount++;
    process.stdout.write('o');
  }
  console.log('\n✓ ' + ordCount + ' orders seeded');

  await client.end();
  console.log('\n🎉 All seed data inserted successfully!');
  console.log('\n═══════════════ CORPORATE LOGINS ═══════════════');
  console.log('TechCorp India  : hr@techcorp.in     / hr1234');
  console.log('Infosys Ltd     : hr@infosys.com     / infosys123');
  console.log('Wipro Tech      : hr@wipro.com       / wipro123');
  console.log('TCS India       : hr@tcs.com         / tcs123');
  console.log('Mahindra Group  : admin@mahindra.com / mahindra123');
  console.log('Flipkart        : wellness@flipkart.com / flipkart123');
  console.log('Amazon India    : hr@amazon.in       / amazon123');
  console.log('Accenture India : wellness@accenture.com / accenture123');
  console.log('═════════════════════════════════════════════════');
}

seed().catch(e => { console.error('Seed error:', e.message); process.exit(1); });
