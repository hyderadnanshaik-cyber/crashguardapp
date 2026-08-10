/**
 * @file useAuditLogs.js
 * @description Real-time Firestore subscription to crash_logs collection.
 *
 * Returns paginated, ordered crash logs for the current user.
 * Used by AuditLogsPanel and AuditLogsPage.
 *
 * Persistence: logs are cached in localStorage keyed by userId so they
 * survive sign-out / page reload without appearing deleted.
 */
import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot, limit, startAfter, getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';

const PAGE_SIZE = 20;

// ── LocalStorage helpers ────────────────────────────────────────────────────
function logsKey(uid) { return `cg_crash_logs_${uid}`; }

function saveLogsToCache(uid, logs) {
  try {
    // Only cache serialisable fields (strip Firestore Timestamps → ISO strings)
    const serializable = logs.map(l => ({
      ...l,
      timestamp: l.timestamp instanceof Date
        ? l.timestamp.toISOString()
        : (l.timestamp || new Date().toISOString()),
    }));
    localStorage.setItem(logsKey(uid), JSON.stringify(serializable));
  } catch (_) {}
}

function loadLogsFromCache(uid) {
  try {
    const raw = localStorage.getItem(logsKey(uid));
    if (!raw) return [];
    return JSON.parse(raw).map(l => ({
      ...l,
      timestamp: l.timestamp ? new Date(l.timestamp) : new Date(),
    }));
  } catch (_) { return []; }
}

/**
 * @param {string|null} userId
 * @returns {{
 *   logs: Array,
 *   loading: boolean,
 *   error: Error | null,
 *   hasMore: boolean,
 *   loadMore: function,
 * }}
 */
export function useAuditLogs(userId) {
  // Seed immediately from cache — no blank flash on reload
  const [logs,    setLogs]    = useState(() => userId ? loadLogsFromCache(userId) : []);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);

  // Refresh cache seed when userId changes
  useEffect(() => {
    if (userId) {
      setLogs(loadLogsFromCache(userId));
    }
  }, [userId]);

  // Real-time subscription to latest logs
  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const logsRef = collection(db, 'users', userId, 'crash_logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(PAGE_SIZE));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          // Convert Firestore Timestamp to JS Date for rendering
          timestamp: d.data().timestamp?.toDate?.() ?? new Date(),
        }));

        setLogs(fetched);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setLoading(false);

        // Persist to localStorage so data survives sign-out/reload
        saveLogsToCache(userId, fetched);
      },
      (err) => {
        console.error('[useAuditLogs] Firestore error:', err);
        setError(err);
        setLoading(false);
        // On Firestore error, fall back to cached data gracefully
        const cached = loadLogsFromCache(userId);
        if (cached.length > 0) setLogs(cached);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  /** Load the next page of logs (appended below current). */
  const loadMore = async () => {
    if (!userId || !lastDoc || !hasMore) return;
    setLoading(true);

    try {
      const logsRef = collection(db, 'users', userId, 'crash_logs');
      const q = query(
        logsRef,
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const more = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate?.() ?? new Date(),
      }));

      const combined = [...logs, ...more];
      setLogs(combined);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      // Update cache with full combined list
      saveLogsToCache(userId, combined);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { logs, loading, error, hasMore, loadMore };
}
