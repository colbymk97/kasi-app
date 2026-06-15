import Dexie from 'dexie';

export const db = new Dexie('kasi');

db.version(1).stores({
  sessions: '++id, startedAt',
});

export async function addSession({ startedAt, durationMs, color, shape, notes }) {
  return db.sessions.add({
    startedAt,
    durationMs,
    color,
    shape,
    notes: notes || '',
  });
}

export async function listSessions(limit = 100) {
  return db.sessions.orderBy('startedAt').reverse().limit(limit).toArray();
}

export async function deleteSession(id) {
  return db.sessions.delete(id);
}

export async function updateSessionNotes(id, notes) {
  return db.sessions.update(id, { notes });
}
