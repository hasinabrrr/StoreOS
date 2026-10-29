import { db } from '../db/dexie/schema';
import type { SyncQueueItem } from '../db/types';

export class SyncQueueManager {
  /**
   * Enqueue a local write operation for background cloud sync
   */
  static async enqueue(
    entityType: SyncQueueItem['entityType'],
    entityLocalId: string,
    op: SyncQueueItem['op'],
    payload: any
  ) {
    const now = new Date().toISOString();
    return await db.syncQueue.add({
      entityType,
      entityLocalId,
      op,
      payload: JSON.stringify(payload),
      status: 'pending',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Get pending sync items ordered by creation time
   */
  static async getPendingItems(): Promise<SyncQueueItem[]> {
    return await db.syncQueue
      .where('status')
      .equals('pending')
      .sortBy('id');
  }

  /**
   * Process pending queue skeleton
   */
  static async processQueue(onProgress?: (synced: number, total: number) => void): Promise<{
    successCount: number;
    failedCount: number;
    conflictCount: number;
  }> {
    const items = await this.getPendingItems();
    let successCount = 0;
    let failedCount = 0;
    let conflictCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.id) continue;

      try {
        await db.syncQueue.update(item.id, {
          status: 'syncing',
          attempts: item.attempts + 1,
          updatedAt: new Date().toISOString(),
        });

        // Offline / Supabase Sync Mock Stub:
        // In full Phase 2-10 integration, this pushes to Supabase REST via idempotency key
        const isOnline = typeof window !== 'undefined' ? window.navigator.onLine : false;

        if (!isOnline) {
          // Keep as pending if offline
          await db.syncQueue.update(item.id, {
            status: 'pending',
            updatedAt: new Date().toISOString(),
          });
          failedCount++;
          continue;
        }

        // Mark as synced locally
        await db.syncQueue.delete(item.id);
        successCount++;
      } catch (err: any) {
        await db.syncQueue.update(item.id, {
          status: 'failed',
          lastError: err?.message || 'Sync failed',
          updatedAt: new Date().toISOString(),
        });
        failedCount++;
      }

      if (onProgress) {
        onProgress(i + 1, items.length);
      }
    }

    // Update last sync time
    await db.meta.put({
      key: 'lastSync',
      value: new Date().toISOString(),
    });

    return { successCount, failedCount, conflictCount };
  }
}

