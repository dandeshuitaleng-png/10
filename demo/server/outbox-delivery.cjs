'use strict';
const crypto = require('node:crypto');

// External delivery runs between short transactions. Event IDs remain stable
// across retries so receivers can deduplicate a timed-out but accepted event.
function createOutboxDelivery({
  store,
  receiver,
  clock = Date.now,
  timeoutMs = 5000,
  batchSize = 50
}) {
  const duration = Math.max(1, Math.min(Number(timeoutMs) || 5000, 30000));
  let inflight = null;

  async function deliver(event) {
    const controller = new AbortController();
    let timer;
    try {
      const response = await Promise.race([
        Promise.resolve().then(() =>
          receiver(
            {
              id: event.id,
              type: event.type,
              userId: event.userId,
              payload: event.payload,
              at: event.at
            },
            { signal: controller.signal }
          )
        ),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('SYNC_TIMEOUT')), duration);
        })
      ]);
      return response === true || response?.accepted === true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }

  async function run() {
    const lease = crypto.randomUUID();
    const events = await store.transaction(async (tx) => {
      const pending = (await tx.list('outbox'))
        .filter(
          (event) =>
            event.status !== 'delivered' &&
            !(event.status === 'delivering' && event.leaseUntil > clock())
        )
        .sort((a, b) => a.at - b.at)
        .slice(0, batchSize);
      for (const event of pending) {
        event.status = 'delivering';
        event.leaseId = lease;
        // The whole batch is reserved even when callbacks run sequentially.
        event.leaseUntil = clock() + duration * pending.length + 1000;
        event.attempts = (event.attempts || 0) + 1;
        event.lastAttemptAt = clock();
        await tx.set('outbox', event.id, event);
      }
      return pending;
    });
    let delivered = 0,
      failed = 0;
    for (const event of events) {
      const accepted = await deliver(event);
      await store.transaction(async (tx) => {
        const current = await tx.get('outbox', event.id);
        if (!current || current.leaseId !== lease) return;
        current.status = accepted ? 'delivered' : 'failed';
        current.lastError = accepted ? '' : '接收端未在限定时间内确认，请检查接收端后重试';
        if (accepted) current.deliveredAt = clock();
        delete current.leaseId;
        delete current.leaseUntil;
        await tx.set('outbox', current.id, current);
      });
      if (accepted) delivered++;
      else failed++;
    }
    return { delivered, failed };
  }

  return {
    retry() {
      if (!inflight)
        inflight = run().finally(() => {
          inflight = null;
        });
      return inflight;
    }
  };
}

module.exports = { createOutboxDelivery };
