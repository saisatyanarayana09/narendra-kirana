import React from 'react';

/**
 * Wraps React.lazy with automatic recovery for stale dynamic import chunks.
 * When a new deployment occurs on Vercel/production, older client sessions
 * attempting to lazy load newly hashed chunks will fail with:
 * "TypeError: Failed to fetch dynamically imported module"
 *
 * This wrapper catches that error, forces a single window reload to load the latest
 * assets, and prevents the user from encountering the crash screen.
 */
export function lazyWithRetry(componentImport) {
  return React.lazy(async () => {
    const sessionKey = 'lazy_chunk_retry_timestamp';
    try {
      const component = await componentImport();
      return component;
    } catch (error) {
      const isChunkLoadFailed =
        error?.name === 'ChunkLoadError' ||
        /failed to fetch dynamically imported module/i.test(error?.message || '') ||
        /loading chunk .* failed/i.test(error?.message || '') ||
        /error loading dynamically imported module/i.test(error?.message || '');

      if (isChunkLoadFailed) {
        const lastRetry = Number(window.sessionStorage.getItem(sessionKey) || 0);
        const now = Date.now();

        // If we haven't auto-reloaded in the last 10 seconds, reload to get fresh index.html
        if (now - lastRetry > 10000) {
          window.sessionStorage.setItem(sessionKey, String(now));
          window.location.reload();
          // Return a hanging promise so React Suspense waits for the page reload to execute
          return new Promise(() => {});
        }
      }

      // If it's another error or already retried recently, let it bubble to ErrorBoundary
      throw error;
    }
  });
}

export default lazyWithRetry;
