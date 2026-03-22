/**
 * Database Seeder — Seeds default categories and a default admin user.
 * Run: node src/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Category = require('./models/Category');
const User = require('./models/User');

const DEFAULT_CATEGORIES = [
  { name: 'Beverages', icon: '☕', color: '#F59E0B' },
  { name: 'Snacks', icon: '🍿', color: '#10B981' },
  { name: 'Groceries', icon: '🛒', color: '#3B82F6' },
  { name: 'Stationery', icon: '✏️', color: '#8B5CF6' },
  { name: 'Miscellaneous', icon: '📦', color: '#6B7280' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create default admin from environment variables or use defaults
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      throw new Error("Missing ADMIN_USERNAME or ADMIN_PASSWORD in environment variables");
    }

    let admin = await User.findOne({ username: adminUsername });
    if (!admin) {
      admin = await User.create({
        name: adminUsername,
        username: adminUsername,
        password: adminPassword,
        role: 'admin',
      });
      console.log(`👤 Default admin created — username: ${adminUsername}`);
    } else {
      console.log('👤 Admin user already exists, skipping...');
    }

    // Seed categories
    for (const cat of DEFAULT_CATEGORIES) {
      const exists = await Category.findOne({ name: cat.name });
      if (!exists) {
        await Category.create({ ...cat, createdBy: admin._id });
        console.log(`📁 Category created: ${cat.icon} ${cat.name}`);
      } else {
        console.log(`📁 Category already exists: ${cat.name}, skipping...`);
      }
    }

    console.log('\n🌱 Seeding complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seed();
