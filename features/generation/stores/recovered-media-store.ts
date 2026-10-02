import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Results that finished while nobody was watching.
 *
 * A generation outlives the run screen: if the socket drops — the app was
 * backgrounded, the user navigated away — `generate` unwinds with an abort and
 * the completion is picked up later by `reconcileAll`, which downloads the
 * media over HTTP. By then the screen that started the run is gone, so there is
 * no callback left to hand the file paths to.
 *
 * They wait here instead, keyed by workflow, until the run screen for that
 * workflow next mounts and takes them. Persisted because the app may be killed
 * outright while a job is still running, and the recovery pass that follows can
 * happen a long time later.
 */
interface RecoveredMediaState {
  /** Keyed by server + workflow; a workflow cannot have two pending batches. */
  pending: Record<string, string[]>;
  stash: (serverId: string, workflowId: string, paths: string[]) => void;
  take: (serverId: string, workflowId: string) => string[];
}

export function recoveredMediaKey(serverId: string, workflowId: string) {
  return `${serverId}|${workflowId}`;
}

export const useRecoveredMediaStore = create<RecoveredMediaState>()(
  persist(
    (set, get) => ({
      pending: {},

      stash: (serverId, workflowId, paths) =>
        set((state) => ({
          pending: {
            ...state.pending,
            [recoveredMediaKey(serverId, workflowId)]: [
              // A second pass can legitimately find more outputs for the same
              // workflow (a batch, or a retry); keep both rather than dropping
              // the earlier files on the floor.
              ...(state.pending[recoveredMediaKey(serverId, workflowId)] ?? []),
              ...paths,
            ],
          },
        })),

      take: (serverId, workflowId) => {
        const key = recoveredMediaKey(serverId, workflowId);
        const paths = get().pending[key] ?? [];
        if (paths.length > 0) {
          set((state) => {
            const next = { ...state.pending };
            delete next[key];
            return { pending: next };
          });
        }
        return paths;
      },
    }),
    {
      name: 'recovered-media-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Record media recovered for a workflow; called from the recovery pass only. */
export function stashRecoveredMedia(serverId: string, workflowId: string, paths: string[]) {
  useRecoveredMediaStore.getState().stash(serverId, workflowId, paths);
}
