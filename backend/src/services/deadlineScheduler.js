import cron from 'node-cron';
import Signalement from '../models/Signalement.js';
import Workflow from '../models/Workflow.js';
import User from '../models/User.js';
import { notifyDeadlineReminder } from './emailService.js';

/* ═══════════════════════════════════════════════════════
   Deadline Reminder Scheduler
   Runs every hour — checks for Level 2 signalements with
   deadlines approaching within 6 hours and sends reminders.
   ═══════════════════════════════════════════════════════ */

let schedulerStarted = false;

export function startDeadlineScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[DeadlineScheduler] Checking for approaching deadlines...');
    try {
      const now = new Date();
      const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      // Find EN_COURS signalements with deadlines in the next 6 hours
      const signalements = await Signalement.find({
        status: 'EN_COURS',
        assignedTo: { $exists: true, $ne: null },
        deadlineAt: {
          $gte: now,
          $lte: sixHoursFromNow
        }
      }).populate('assignedTo', 'email name');

      if (signalements.length === 0) {
        console.log('[DeadlineScheduler] No approaching deadlines found.');
        return;
      }

      console.log(`[DeadlineScheduler] Found ${signalements.length} signalements with approaching deadlines.`);

      for (const sig of signalements) {
        if (!sig.assignedTo?.email) continue;

        const hoursRemaining = (sig.deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        await notifyDeadlineReminder({
          email: sig.assignedTo.email,
          name: sig.assignedTo.name,
          signalementTitle: sig.title,
          signalementId: sig._id,
          deadlineAt: sig.deadlineAt,
          hoursRemaining
        });
      }

      // Also check workflow stage deadlines
      const workflows = await Workflow.find({
        status: { $ne: 'COMPLETED' }
      }).populate('assignedTo', 'email name').populate('signalement', 'title');

      const STAGES = ['ficheInitiale', 'rapportDpe', 'evaluationComplete', 'planAction', 'rapportSuivi', 'rapportFinal'];

      for (const wf of workflows) {
        if (!wf.assignedTo?.email) continue;

        for (const stageKey of STAGES) {
          const stage = wf.stages?.[stageKey];
          if (!stage || stage.completed || !stage.dueAt) continue;

          const dueAt = new Date(stage.dueAt);
          if (dueAt >= now && dueAt <= sixHoursFromNow) {
            const hoursRemaining = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);

            await notifyDeadlineReminder({
              email: wf.assignedTo.email,
              name: wf.assignedTo.name,
              signalementTitle: wf.signalement?.title || `Workflow ${wf._id}`,
              signalementId: wf.signalement?._id || wf._id,
              deadlineAt: dueAt,
              hoursRemaining
            });
          }
        }
      }

      console.log('[DeadlineScheduler] Deadline check complete.');
    } catch (err) {
      console.error('[DeadlineScheduler] Error:', err.message);
    }
  });

  console.log('[DeadlineScheduler] Started — checking every hour for approaching deadlines.');
}

export default { startDeadlineScheduler };
