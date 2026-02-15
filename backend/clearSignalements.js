import mongoose from 'mongoose';
import Signalement from './src/models/Signalement.js';
import Workflow from './src/models/Workflow.js';

const clearSignalements = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/safeguarding');
    console.log('MongoDB connected');

    // Delete all signalements and workflows
    const sigCount = await Signalement.deleteMany({});
    const wfCount = await Workflow.deleteMany({});

    console.log(`✅ Deleted ${sigCount.deletedCount} signalements`);
    console.log(`✅ Deleted ${wfCount.deletedCount} workflows`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

clearSignalements();
