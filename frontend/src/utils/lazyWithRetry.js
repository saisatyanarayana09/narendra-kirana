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
        const retryCount = Number(window.sessionStorage.getItem('lazy_chunk_retry_count') || 0);

        // Allow at most 1 reload attempt per user session
        if (retryCount < 1) {
          window.sessionStorage.setItem('lazy_chunk_retry_count', '1');
          window.location.reload();
          // Return a hanging promise so React Suspense waits for the page reload to execute
          return new Promise(() => {});
        } else {
          console.warn('lazyWithRetry: Max reload attempt reached. Halting auto-reload to prevent loop.');
        }
      }

      // Bubble to ErrorBoundary if retry already exhausted or other error
      throw error;
    }
  });
}

export default lazyWithRetry;
