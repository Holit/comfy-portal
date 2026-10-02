import { useEffect } from 'react';

import { recoveredMediaKey, useRecoveredMediaStore } from '@/features/generation/stores/recovered-media-store';
import { useGenerationActions } from '@/features/generation/context/generation-context';

interface RecoveredMediaBridgeProps {
  serverId: string;
  workflowId: string;
}

/**
 * Surfaces results that finished while this screen was not mounted.
 *
 * Recovery (see job-recovery) downloads media long after the run that produced
 * it stopped being watched — the app was backgrounded, the screen unmounted, or
 * the process was killed. It cannot call into the screen, so it leaves the paths
 * in a store; this takes them the moment the matching run screen is showing.
 *
 * Must be rendered inside `GenerationProvider` and under the route that owns
 * `serverId`/`workflowId`.
 */
export function RecoveredMediaBridge({ serverId, workflowId }: RecoveredMediaBridgeProps) {
  const { setGeneratedMedia } = useGenerationActions();
  const key = recoveredMediaKey(serverId, workflowId);

  // Covers media recovered before this screen mounted (the common case: the app
  // was backgrounded and the pass ran on the way back in).
  useEffect(() => {
    const paths = useRecoveredMediaStore.getState().take(serverId, workflowId);
    if (paths.length > 0) setGeneratedMedia(paths);
  }, [serverId, workflowId, setGeneratedMedia]);

  // Covers media recovered while this screen is already up, e.g. the poll timer
  // firing after the user returned to a screen whose run had been aborted.
  useEffect(
    () =>
      useRecoveredMediaStore.subscribe((state) => {
        if (state.pending[key]?.length) {
          const paths = useRecoveredMediaStore.getState().take(serverId, workflowId);
          if (paths.length > 0) setGeneratedMedia(paths);
        }
      }),
    [key, serverId, workflowId, setGeneratedMedia],
  );

  return null;
}
