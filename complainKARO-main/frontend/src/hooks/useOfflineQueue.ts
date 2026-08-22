import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'VocalLabsOfflineQueue';
const DB_VERSION = 1;
const STORE_NAME = 'pendingComplaints';

interface QueuedComplaint {
  id: string;
  timestamp: number;
  audioBlob: Blob;
  mimeType: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueue(item: QueuedComplaint): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dequeue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllQueued(): Promise<QueuedComplaint[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedComplaint[]);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Manages offline complaint queue using IndexedDB.
 * Automatically drains the queue when the network comes back online.
 */
export function useOfflineQueue(token: string | null, onSync?: (count: number) => void) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    const items = await getAllQueued().catch(() => []);
    setPendingCount(items.length);
  }, []);

  const addToQueue = useCallback(async (audioBlob: Blob, mimeType: string): Promise<void> => {
    const item: QueuedComplaint = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      audioBlob,
      mimeType,
    };
    await enqueue(item);
    await refreshCount();
  }, [refreshCount]);

  const drainQueue = useCallback(async () => {
    if (!token || isSyncing) return;

    const items = await getAllQueued().catch(() => []);
    if (items.length === 0) return;

    setIsSyncing(true);
    let synced = 0;

    for (const item of items) {
      try {
        const formData = new FormData();
        formData.append('audio', item.audioBlob, `complaint.${item.mimeType.split('/')[1] || 'webm'}`);

        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/complaints`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (res.ok) {
          await dequeue(item.id);
          synced++;
        }
      } catch {
        // Leave item in queue; will retry on next online event
      }
    }

    setIsSyncing(false);
    await refreshCount();
    if (synced > 0) onSync?.(synced);
  }, [token, isSyncing, onSync, refreshCount]);

  // Listen for online event to drain queue
  useEffect(() => {
    refreshCount();

    const handleOnline = () => drainQueue();
    window.addEventListener('online', handleOnline);

    // Also attempt drain on mount if online
    if (navigator.onLine) drainQueue();

    return () => window.removeEventListener('online', handleOnline);
  }, [drainQueue, refreshCount]);

  return { pendingCount, isSyncing, addToQueue, drainQueue };
}
