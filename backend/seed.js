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

    console.log(`✓ Created ${users.length} users`);

    // Create sample signalements
    const signalements = [];

    // Signalements for Fatma (SOS Mother)
    const sig1 = await Signalement.create({
      title: 'Problème de comportement en classe',
      description: 'Ahmed présente des difficultés de concentration en classe et perturbe souvent les autres enfants. Il a besoin d\'un suivi psychologique.',
      village: villages[0]._id,
      program: 'Éducation',
      incidentType: 'COMPORTEMENT',
      urgencyLevel: 'MOYEN',
      status: 'EN_ATTENTE',
      isAnonymous: false,
      childName: 'Ahmed Ben Ali',
      createdBy: user3._id
    });
    signalements.push(sig1);

    const sig2 = await Signalement.create({
      title: 'Consultation médicale urgente',
      description: 'Leila tousse beaucoup depuis 3 jours et a de la fièvre. Elle doit voir un médecin rapidement.',
      village: villages[0]._id,
      program: 'Santé',
      incidentType: 'SANTE',
      urgencyLevel: 'ELEVE',
      status: 'EN_COURS',
      isAnonymous: false,
      childName: 'Leila Mansouri',
      createdBy: user3._id,
      assignedTo: user2._id
    });
    signalements.push(sig2);

    const sig3 = await Signalement.create({
      title: 'Difficulté familiale',
      description: 'Contact avec la famille biologique difficile. La mère est absente aux rendez-vous prévus.',
      village: villages[0]._id,
      program: 'Accueil familial',
      incidentType: 'FAMILIAL',
      urgencyLevel: 'FAIBLE',
      status: 'CLOTURE',
      isAnonymous: false,
      createdBy: user3._id
    });
    signalements.push(sig3);

    // Signalements for Ahmed (Educator)
    const sig4 = await Signalement.create({
      title: 'Retard scolaire important',
      description: 'Youssef accumule du retard dans plusieurs matières, notamment en mathématiques et en français. Besoin de soutien scolaire.',
      village: villages[1]._id,
      program: 'Éducation',
      incidentType: 'EDUCATION',
      urgencyLevel: 'MOYEN',
      status: 'EN_ATTENTE',
      isAnonymous: false,
      childName: 'Youssef Trabelsi',
      createdBy: user4._id
    });
    signalements.push(sig4);

    const sig5 = await Signalement.create({
      title: 'Enfant isolé socialement',
      description: 'Salma reste souvent seule pendant les récréations et refuse de participer aux activités de groupe.',
      village: villages[1]._id,
      program: 'Protection de l\'enfance',
      incidentType: 'VIOLENCE_PSYCHOLOGIQUE',
      urgencyLevel: 'MOYEN',
      status: 'EN_ATTENTE',
      isAnonymous: false,
      childName: 'Salma Jendoubi',
      createdBy: user4._id
    });
    signalements.push(sig5);

    console.log(`✓ Created ${signalements.length} sample signalements`);

    // Update village statistics
    villages[0].totalSignalements = 3;
    await villages[0].save();
    villages[1].totalSignalements = 2;
    await villages[1].save();

    // Update village directors
    villages[0].director = users[1]._id;
    await villages[0].save();
    console.log('✓ Assigned village directors');

    console.log('\n✅ Database seeded successfully!\n');
    console.log('🏘️ Villages créés: Gammarth, Siliana, Mahres, Akouda');
    console.log('📋 Signalements créés: 5 exemples (3 pour Fatma, 2 pour Ahmed)\n');
    console.log('📧 Test Accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('LEVEL 3 (Admin):');
    console.log('  Email: admin@sos.tn');
    console.log('  Password: admin123\n');
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
