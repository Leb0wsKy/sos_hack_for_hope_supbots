let io = null;

export const setSocketServer = (server) => {
  io = server;
};

export const getSocketServer = () => io;

const roomForRole = (role) => `role:${role}`;
const roomForRoleVillage = (role, villageId) => `role:${role}:village:${villageId}`;
const roomForRoleDetails = (roleDetails) => `roleDetails:${roleDetails}`;
const roomForRoleDetailsVillage = (roleDetails, villageId) =>
  `roleDetails:${roleDetails}:village:${villageId}`;
const roomForUser = (userId) => `user:${userId}`;

const resolveTargets = (event, payload) => {
  const villageId = payload?.village ? String(payload.village) : null;

  switch (event) {
    case 'signalement.created':
      if (!villageId) return [];
      return [roomForRoleVillage('LEVEL2', villageId)];
    case 'workflow.stageCompleted':
      if (!villageId) return [];
      return [
        roomForRoleDetailsVillage('VILLAGE_DIRECTOR', villageId),
        roomForRoleDetails('NATIONAL_OFFICE')
      ];
    case 'signalement.closed':
      // Notify the Level 1 user who created the signalement
      const targets = [];
      if (payload?.createdBy) {
        targets.push(roomForUser(String(payload.createdBy)));
      }
      if (villageId) {
        targets.push(roomForRoleVillage('LEVEL1', villageId));
        targets.push(roomForRoleDetailsVillage('VILLAGE_DIRECTOR', villageId));
      }
      return targets;
    case 'signalement.escalated':
      if (payload?.escalatedTo === 'NATIONAL_OFFICE') {
        return [roomForRoleDetails('NATIONAL_OFFICE')];
      }
      if (payload?.escalatedTo === 'VILLAGE_DIRECTOR' && villageId) {
        return [roomForRoleDetailsVillage('VILLAGE_DIRECTOR', villageId)];
      }
      return [];
    case 'signalement.assigned':
      if (!payload?.assignedTo) return [];
      return [roomForUser(String(payload.assignedTo))];
    default:
      return [];
  }
};

export const emitEvent = (event, payload) => {
  if (!io) return;
  const targets = resolveTargets(event, payload);
  if (!targets.length) return;
  targets.forEach((room) => io.to(room).emit(event, payload));
};
