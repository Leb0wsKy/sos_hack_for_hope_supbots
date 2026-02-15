import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Village from './src/models/Village.js';
import connectDB from './src/config/db.js';

dotenv.config();

const usersToEnsure = (villages) => {
  const firstVillage = villages[0];
  const allVillageIds = villages.map((v) => v._id);

  return [
    {
      name: 'SOS Mother A',
      email: 'sos_mother@sos.tn',
      password: 'sosmother123',
      role: 'LEVEL1',
      roleDetails: 'SOS_MOTHER',
      village: firstVillage?._id,
      childrenCount: 6
    },
    {
      name: 'Educator A',
      email: 'educator@sos.tn',
      password: 'educator123',
      role: 'LEVEL1',
      roleDetails: 'EDUCATOR',
      village: firstVillage?._id,
      childrenCount: 4
    },
    {
      name: 'Field Staff A',
      email: 'field_staff@sos.tn',
      password: 'fieldstaff123',
      role: 'LEVEL1',
      roleDetails: 'FIELD_STAFF',
      village: firstVillage?._id
    },
    {
      name: 'Psychologist A',
      email: 'psychologist@sos.tn',
      password: 'psych123',
      role: 'LEVEL2',
      roleDetails: 'PSYCHOLOGIST',
      village: firstVillage?._id
    },
    {
      name: 'Social Worker A',
      email: 'social_worker@sos.tn',
      password: 'social123',
      role: 'LEVEL2',
      roleDetails: 'SOCIAL_WORKER',
      village: firstVillage?._id
    },
    {
      name: 'Village Director A',
      email: 'village_director@sos.tn',
      password: 'director123',
      role: 'LEVEL3',
      roleDetails: 'VILLAGE_DIRECTOR',
      village: firstVillage?._id
    },
    {
      name: 'National Office A',
      email: 'national_office@sos.tn',
      password: 'national123',
      role: 'LEVEL3',
      roleDetails: 'NATIONAL_OFFICE',
      accessibleVillages: allVillageIds
    },
    {
      name: 'Super Admin A',
      email: 'super_admin@sos.tn',
      password: 'super123',
      role: 'LEVEL4',
      roleDetails: 'SUPER_ADMIN'
    }
  ];
};

const ensureUser = async (data) => {
  const existing = await User.findOne({ email: data.email });

  if (!existing) {
    const created = await User.create({ ...data, isActive: true });
    return { user: created, status: 'created' };
  }

  existing.name = data.name;
  existing.password = data.password;
  existing.role = data.role;
  existing.roleDetails = data.roleDetails;
  existing.village = data.village || undefined;
  existing.accessibleVillages = data.accessibleVillages || [];
  existing.childrenCount = data.childrenCount || 0;
  existing.isActive = true;

  await existing.save();
  return { user: existing, status: 'updated' };
};

const main = async () => {
  try {
    await connectDB();

    const villages = await Village.find({ isActive: true });
    if (!villages.length) {
      console.error('No active villages found. Run the seed script first.');
      await mongoose.disconnect();
      return;
    }

    const targets = usersToEnsure(villages);
    const results = [];

    for (const data of targets) {
      const result = await ensureUser(data);
      results.push({ ...data, status: result.status });

      if (data.roleDetails === 'VILLAGE_DIRECTOR' && data.village) {
        const village = villages.find((v) => String(v._id) === String(data.village));
        if (village && (!village.director || String(village.director) !== String(result.user._id))) {
          village.director = result.user._id;
          await village.save();
        }
      }
    }

    console.log('Test users ensured for all role details:');
    console.log('');
    results.forEach((item) => {
      console.log(`- ${item.role} / ${item.roleDetails} (${item.status})`);
      console.log(`  Email: ${item.email}`);
      console.log(`  Password: ${item.password}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error ensuring test users:', error.message);
    await mongoose.disconnect();
  }
};

main();
