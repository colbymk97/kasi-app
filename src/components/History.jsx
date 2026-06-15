import { useEffect, useState } from 'react';
import { listSessions, deleteSession, updateSessionNotes } from '../lib/db.js';
import { formatDate, formatMinutes } from '../lib/formatDuration.js';

export default function History({ onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [draftNotes, setDraftNotes] = useState('');

  useEffect(() => {
    let active = true;
    listSessions().then((rows) => {
      if (active) {
        setSessions(rows);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (id) => {
    await deleteSession(id);
    setSessions((s) => s.filter((row) => row.id !== id));
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setDraftNotes(s.notes || '');
  };

  const saveEdit = async () => {
    await updateSessionNotes(editingId, draftNotes);
    setSessions((rows) =>
      rows.map((r) => (r.id === editingId ? { ...r, notes: draftNotes } : r))
    );
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-30 bg-black overflow-y-auto"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
      }}
    >
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-sm uppercase tracking-widest text-white/60">Sessions</h1>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white text-sm uppercase tracking-widest px-2 py-1"
          >
            Close
          </button>
        </div>

        {loading ? (
          <p className="text-white/30 text-sm">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-white/30 text-sm">No sessions yet. Start a timer to log one.</p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className="border border-white/10 rounded p-3">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block w-4 h-4 rounded-full shrink-0"
                    style={
                      s.shape === 'flame'
                        ? {
                            background:
                              'radial-gradient(circle at 50% 70%, #fff7d6 0%, #fbbf24 45%, #f97316 80%, #1e40af 100%)',
                            borderRadius: '45% 45% 50% 50% / 60% 60% 40% 40%',
                          }
                        : {
                            background: s.color,
                            borderRadius: s.shape === 'square' ? '20%' : '50%',
                          }
                    }
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm">{formatDate(s.startedAt)}</div>
                    <div className="text-white/40 text-xs">{formatMinutes(s.durationMs)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="text-white/30 hover:text-white/70 text-xs uppercase tracking-widest"
                    aria-label="Delete session"
                  >
                    Delete
                  </button>
                </div>
                {editingId === s.id ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <textarea
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      rows={3}
                      className="bg-transparent border border-white/15 rounded p-2 text-sm text-white"
                      placeholder="Notes"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-white/40 text-xs uppercase tracking-widest px-2 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="text-white text-xs uppercase tracking-widest px-2 py-1 border border-white/30 rounded"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    className="mt-2 text-left w-full text-white/60 text-sm italic hover:text-white/80"
                  >
                    {s.notes ? s.notes : 'Add notes…'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
