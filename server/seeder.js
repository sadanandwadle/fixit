const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const Service = require('./models/Service');
const Provider = require('./models/Provider');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fixit_dev');

const services = [
  { name: 'Electrician', category: 'Home Repair', description: 'Professional electrical repairs and installations', icon: 'zap', active: true },
  { name: 'Plumber', category: 'Home Repair', description: 'Expert plumbing services and pipe repairs', icon: 'droplet', active: true },
  { name: 'AC Technician', category: 'Appliance Repair', description: 'AC servicing, repair, and installation', icon: 'wind', active: true },
  { name: 'Mechanic', category: 'Auto Repair', description: 'Car and bike repairs and maintenance', icon: 'tool', active: true },
  { name: 'Cleaner', category: 'Cleaning', description: 'Deep cleaning for homes and offices', icon: 'sparkles', active: true },
  { name: 'Computer Repair', category: 'Electronics', description: 'Laptop and desktop troubleshooting', icon: 'monitor', active: true }
];

const seedData = async () => {
  try {
    console.log('Seeding data...');
    
    // Seed Services (Idempotent: update or insert based on name)
    const serviceMap = {};
    for (const s of services) {
      const updated = await Service.findOneAndUpdate(
        { name: s.name },
        { $set: s },
        { new: true, upsert: true }
      );
      serviceMap[s.name] = updated._id;
    }
    console.log('Services seeded.');

    // Seed User for Providers
    // We'll create two fake provider users
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const p1Email = 'seed_provider1@test.com';
    let user1 = await User.findOne({ email: p1Email });
    if (!user1) {
      user1 = await User.create({
        name: 'John Fixit',
        email: p1Email,
        password: hashedPassword,
        role: 'provider'
      });
    } else {
      user1.password = hashedPassword;
      await user1.save();
    }

    const p2Email = 'seed_provider2@test.com';
    let user2 = await User.findOne({ email: p2Email });
    if (!user2) {
      user2 = await User.create({
        name: 'Jane Expert',
        email: p2Email,
        password: hashedPassword,
        role: 'provider'
      });
    } else {
      user2.password = hashedPassword;
      await user2.save();
    }
    
    // Drop old indexes to prevent conflicts
    await Provider.collection.dropIndexes().catch(() => {});
    
    // Seed Providers
    await Provider.findOneAndUpdate(
      { user: user1._id },
      { $set: {
          professionalName: 'John\'s Electrical & Plumbing',
          description: 'Experienced in all home repairs. Guaranteed quality.',
          services: [serviceMap['Electrician'], serviceMap['Plumber']],
          pricing: '$50/hr base rate',
          experience: '10 years',
          verified: true,
          rating: 4.8,
          reviewCount: 24,
          availability: 'Mon-Sat 8AM-6PM'
        }
      },
      { upsert: true }
    );

    await Provider.findOneAndUpdate(
      { user: user2._id },
      { $set: {
          professionalName: 'Jane AC & Cleaning',
          description: 'Top rated AC technician and deep cleaning services.',
          services: [serviceMap['AC Technician'], serviceMap['Cleaner']],
          pricing: '$40/hr base rate',
          experience: '5 years',
          verified: true,
          rating: 4.9,
          reviewCount: 56,
          availability: 'Flexible schedule'
        }
      },
      { upsert: true }
    );
    
    console.log('Providers seeded.');
    
    // Seed Admin (if env variables provided)
    if (process.env.ADMIN_SEED_EMAIL && process.env.ADMIN_SEED_PASSWORD) {
      const adminEmail = process.env.ADMIN_SEED_EMAIL;
      let admin = await User.findOne({ email: adminEmail });
      
      const adminHashedPassword = await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD, salt);
      
      if (!admin) {
        await User.create({
          name: 'Platform Admin',
          email: adminEmail,
          password: adminHashedPassword,
          role: 'admin',
          isActive: true
        });
        console.log(`Admin seeded with email: ${adminEmail}`);
      } else {
        admin.password = adminHashedPassword;
        admin.role = 'admin';
        admin.isActive = true;
        await admin.save();
        console.log(`Admin updated for email: ${adminEmail}`);
      }
    } else {
      console.log('Skipping Admin seed (ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD not set).');
    }

    console.log('Seed completed successfully!');
    process.exit();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
