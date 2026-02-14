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
      if (payload?.stage === 'initialReport' || payload?.stage === 'finalReport') {
        return [
          roomForRoleDetailsVillage('VILLAGE_DIRECTOR', villageId),
          roomForRoleDetails('NATIONAL_OFFICE')
        ];
      }
      return [];
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
