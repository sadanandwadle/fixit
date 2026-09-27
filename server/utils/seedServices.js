require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const { initialServices } = require('../controllers/serviceController');

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixit';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB...');

    await Service.deleteMany({});
    console.log('[Seed] Cleared existing services.');

    const created = await Service.insertMany(initialServices);
    console.log(`[Seed] Successfully inserted ${created.length} initial services.`);

    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding services:', error.message);
    process.exit(1);
  }
};

seedDB();
