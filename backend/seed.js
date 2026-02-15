import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Village from './src/models/Village.js';
import Signalement from './src/models/Signalement.js';
import connectDB from './src/config/db.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('🌱 Seeding database...\n');

    // Clear existing data
    await User.deleteMany({});
    await Village.deleteMany({});
    await Signalement.deleteMany({});
    console.log('✓ Cleared existing data');

    // Create Villages
    const villages = await Village.insertMany([
      {
        name: 'SOS Village de Gammarth',
        location: 'Gammarth, Tunisie',
        region: 'Tunis',
        programs: ['Accueil familial', 'Éducation', 'Santé'],
        coordinates: { latitude: 37.0667, longitude: 10.1833 }
      },
      {
        name: 'SOS Village de Siliana',
        location: 'Siliana, Tunisie',
        region: 'Siliana',
        programs: ['Protection de l\'enfance', 'Éducation'],
        coordinates: { latitude: 36.0833, longitude: 9.3667 }
      },
      {
        name: 'SOS Village de Mahres',
        location: 'Mahres, Sfax, Tunisie',
        region: 'Sfax',
        programs: ['Accueil familial', 'Formation professionnelle'],
        coordinates: { latitude: 34.5333, longitude: 10.5000 }
      },
      {
        name: 'SOS Village d\'Akouda',
        location: 'Akouda, Sousse, Tunisie',
        region: 'Sousse',
        programs: ['Accueil familial', 'Éducation', 'Accompagnement social'],
        coordinates: { latitude: 35.8689, longitude: 10.5653 }
      }
    ]);
    console.log(`✓ Created ${villages.length} villages`);

    // Create Users (using .create() to trigger password hashing middleware)
    const users = [];
    
    const user1 = await User.create({
      name: 'Admin Level 3',
      email: 'admin@sos.tn',
      password: 'admin123',
      role: 'LEVEL3',
      roleDetails: 'NATIONAL_OFFICE',
      accessibleVillages: villages.map(v => v._id)
    });
    users.push(user1);

    const user2 = await User.create({
      name: 'Dr. Psychologue',
      email: 'psy@sos.tn',
      password: 'psy123',
      role: 'LEVEL2',
      roleDetails: 'PSYCHOLOGIST',
      village: villages[0]._id
    });
    users.push(user2);

    const user3 = await User.create({
      name: 'Maman SOS Fatma',
      email: 'fatma@sos.tn',
      password: 'fatma123',
      role: 'LEVEL1',
      roleDetails: 'SOS_MOTHER',
      village: villages[0]._id,
      childrenCount: 8
    });
    users.push(user3);

    const user4 = await User.create({
      name: 'Éducateur Ahmed',
      email: 'ahmed@sos.tn',
      password: 'ahmed123',
      role: 'LEVEL1',
      roleDetails: 'EDUCATOR',
      village: villages[1]._id,
      childrenCount: 6
    });
    users.push(user4);

    const user5 = await User.create({
      name: 'Directeur Village Gammarth',
      email: 'directeur@sos.tn',
      password: 'directeur123',
      role: 'LEVEL2',
      roleDetails: 'VILLAGE_DIRECTOR',
      village: villages[0]._id
    });
    users.push(user5);

    console.log(`✓ Created ${users.length} users`);

    // Update village directors
    villages[0].director = users[1]._id;
    await villages[0].save();
    console.log('✓ Assigned village directors');

    console.log('\n✅ Database seeded successfully!\n');
    console.log('🏘️ Villages créés: Gammarth, Siliana, Mahres, Akouda');
    console.log('\n📧 Test Accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('LEVEL 3 (National Office):');
    console.log('  Email: admin@sos.tn');
    console.log('  Password: admin123\n');
    console.log('LEVEL 2 (Village Director - Gammarth):');
    console.log('  Email: directeur@sos.tn');
    console.log('  Password: directeur123\n');
    console.log('LEVEL 2 (Psychologist):');
    console.log('  Email: psy@sos.tn');
    console.log('  Password: psy123\n');
    console.log('LEVEL 1 (SOS Mother - 8 enfants):');
    console.log('  Email: fatma@sos.tn');
    console.log('  Password: fatma123');
    console.log('  Village: Gammarth\n');
    console.log('LEVEL 1 (Educator - 6 enfants):');
    console.log('  Email: ahmed@sos.tn');
    console.log('  Password: ahmed123');
    console.log('  Village: Siliana\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
