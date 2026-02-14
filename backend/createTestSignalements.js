// Create diverse signalements for DPE testing
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Signalement from './src/models/Signalement.js';
import Village from './src/models/Village.js';
import User from './src/models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

async function createTestSignalements() {
  try {
    // Get references
    const villages = await Village.find();
    const fatma = await User.findOne({ email: 'fatma@sos.tn' });
    const ahmed = await User.findOne({ email: 'ahmed@sos.tn' });

    if (!villages.length || !fatma || !ahmed) {
      console.error('Missing users or villages. Run seed.js first.');
      process.exit(1);
    }

    const gammarth = villages[0]._id;
    const siliana = villages[1]._id;

    // Create diverse signalements
    const signalements = [
      {
        title: 'Enfant montrant des signes de tristesse persistante',
        description: 'L\'enfant Mohamed (10 ans) présente une tristesse persistante depuis 2 semaines. Il refuse de participer aux activités de groupe et s\'isole pendant les récréations. Son appétit a diminué et il a des difficultés à s\'endormir. L\'équipe éducative a remarqué un changement de comportement suite au décès de son grand-père.',
        village: gammarth,
        program: 'Accueil Familial',
        incidentType: 'COMPORTEMENT',
        urgencyLevel: 'MOYEN',
        isAnonymous: false,
        createdBy: fatma._id,
        status: 'EN_ATTENTE'
      },
      {
        title: 'Bagarres répétées entre deux enfants',
        description: 'Deux enfants (Amine 12 ans et Karim 11 ans) se sont bagarrés à trois reprises cette semaine. Les conflits surviennent principalement lors des activités sportives. Amine accuse Karim de tricher et Karim dit qu\'Amine est agressif. L\'éducateur a tenté une médiation mais les tensions persistent.',
        village: gammarth,
        program: 'Village d\'Enfants',
        incidentType: 'VIOLENCE_PHYSIQUE',
        urgencyLevel: 'ELEVE',
        isAnonymous: false,
        createdBy: fatma._id,
        status: 'EN_ATTENTE'
      },
      {
        title: 'Chute avec suspicion de fracture',
        description: 'Salma (8 ans) est tombée pendant la récréation. Elle se plaint de douleurs au bras gauche et ne peut pas le bouger. Un gonflement est visible au niveau du poignet. Les premiers soins ont été prodigués et l\'enfant est actuellement au repos en attendant le transport vers l\'hôpital pour radiographie.',
        village: siliana,
        program: 'Accueil Familial',
        incidentType: 'SANTE',
        urgencyLevel: 'CRITIQUE',
        isAnonymous: false,
        createdBy: ahmed._id,
        status: 'EN_ATTENTE'
      },
      {
        title: 'Difficultés scolaires importantes',
        description: 'Yasmine (13 ans) accumule des retards dans plusieurs matières. Son institutrice signale un manque de concentration et d\'intérêt. Yasmine exprime des angoisses concernant les examens et dit qu\'elle "n\'est pas assez intelligente". Elle a commencé à éviter l\'école avec des plaintes de maux de ventre.',
        village: gammarth,
        program: 'Village d\'Enfants',
        incidentType: 'EDUCATION',
        urgencyLevel: 'MOYEN',
        isAnonymous: false,
        createdBy: fatma._id,
        status: 'EN_ATTENTE'
      },
      {
        title: 'Enfant rapportant des paroles inappropriées',
        description: 'Un enfant (9 ans, signalement anonyme) a rapporté avoir entendu des propos à connotation sexuelle de la part d\'un visiteur externe lors d\'une activité. L\'enfant semble perturbé et a posé des questions inhabituelles à l\'éducatrice. L\'identité du visiteur est connue et des mesures préventives ont été prises.',
        village: siliana,
        program: 'Accueil Familial',
        incidentType: 'VIOLENCE_PSYCHOLOGIQUE',
        urgencyLevel: 'ELEVE',
        isAnonymous: true,
        createdBy: ahmed._id,
        status: 'EN_ATTENTE'
      }
    ];

    // Clear previous test signalements
    await Signalement.deleteMany({ 
      title: { $in: signalements.map(s => s.title) } 
    });

    // Create new signalements
    const created = await Signalement.create(signalements);

    console.log(`✅ Created ${created.length} test signalements:`);
    created.forEach(s => {
      console.log(`  - ${s.title} (${s.incidentType}, ${s.urgencyLevel})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestSignalements();
