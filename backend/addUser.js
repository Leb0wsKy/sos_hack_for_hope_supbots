import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'readline';
import User from './src/models/User.js';
import Village from './src/models/Village.js';
import connectDB from './src/config/db.js';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const addUser = async () => {
  try {
    await connectDB();

    console.log('\n🔐 SOS Villages - Add New User');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get villages
    const villages = await Village.find({ isActive: true });
    console.log('Available Villages:');
    villages.forEach((v, i) => console.log(`  ${i + 1}. ${v.name} (${v.location})`));
    console.log('');

    // Collect user information
    const name = await question('Full Name: ');
    const email = await question('Email: ');
    const password = await question('Password: ');
    
    console.log('\nRole:');
    console.log('  1. LEVEL1 (Terrain User - SOS Mother, Educator, Field Staff)');
    console.log('  2. LEVEL2 (Psychologist, Social Worker)');
    console.log('  3. LEVEL3 (Village Director, National Office)');
    console.log('  4. LEVEL4 (Super Admin)');
    const roleChoice = await question('Select role (1-4): ');
    
    const roleMap = { '1': 'LEVEL1', '2': 'LEVEL2', '3': 'LEVEL3', '4': 'LEVEL4' };
    const role = roleMap[roleChoice] || 'LEVEL1';

    console.log('\nRole Details:');
    if (role === 'LEVEL1') {
      console.log('  1. SOS_MOTHER');
      console.log('  2. EDUCATOR');
      console.log('  3. FIELD_STAFF');
    } else if (role === 'LEVEL2') {
      console.log('  1. PSYCHOLOGIST');
      console.log('  2. SOCIAL_WORKER');
    } else if (role === 'LEVEL3') {
      console.log('  1. VILLAGE_DIRECTOR');
      console.log('  2. NATIONAL_OFFICE');
    } else {
      console.log('  1. SUPER_ADMIN');
    }
    const roleDetailChoice = await question('Select role details (1-2): ');
    
    const roleDetailsMap = {
      'LEVEL1': { '1': 'SOS_MOTHER', '2': 'EDUCATOR', '3': 'FIELD_STAFF' },
      'LEVEL2': { '1': 'PSYCHOLOGIST', '2': 'SOCIAL_WORKER' },
      'LEVEL3': { '1': 'VILLAGE_DIRECTOR', '2': 'NATIONAL_OFFICE' },
      'LEVEL4': { '1': 'SUPER_ADMIN' }
    };
    const roleDetails = roleDetailsMap[role][roleDetailChoice];

    let village;
    if (role !== 'LEVEL4') {
      const villageChoice = await question(`\nSelect village (1-${villages.length}): `);
      village = villages[parseInt(villageChoice) - 1]?._id;
    }

    const phone = await question('Phone (optional): ');

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('\n❌ User with this email already exists!');
      process.exit(1);
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role,
      roleDetails,
      village: village || undefined,
      phone: phone || undefined,
      isActive: true
    });

    await user.save();

    console.log('\n✅ User created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    console.log(`Role Details: ${roleDetails}`);
    if (village) {
      const villageName = villages.find(v => String(v._id) === String(village))?.name;
      console.log(`Village: ${villageName}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    process.exit(1);
  }
};

addUser();
