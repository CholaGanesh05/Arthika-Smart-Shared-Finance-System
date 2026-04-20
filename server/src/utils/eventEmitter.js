export const emitEvent = (groupId, type, data = {}) => {
  if (!global.io) return;

  global.io.to(groupId.toString()).emit(type, {
    type,
    groupId,
    data,
    timestamp: Date.now(),
  });
};