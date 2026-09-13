import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type DemoProviderId = "bmoni" | "moniflow-sandbox";
export type DemoRecoveryStage =
  | "home"
  | "processing"
  | "plan"
  | "guard"
  | "approve"
  | "signing"
  | "execution"
  | "result";

type DemoSessionState = {
  hydrated: boolean;
  localUserId: string;
  provider: DemoProviderId | null;
  command: string;
  planId: string;
  stage: DemoRecoveryStage | null;
  updatedAt: string | null;
  setHydrated: (hydrated: boolean) => void;
  setWorkspace: (localUserId: string, provider: DemoProviderId) => void;
  beginFlow: (command: string) => void;
  setFlowStage: (stage: DemoRecoveryStage, options?: { planId?: string; command?: string }) => void;
  finishFlow: () => void;
  clearSession: () => void;
};

const emptySession = {
  localUserId: "",
  provider: null as DemoProviderId | null,
  command: "",
  planId: "",
  stage: null as DemoRecoveryStage | null,
  updatedAt: null as string | null
};

export const useDemoSession = create<DemoSessionState>()(
  persist(
    (set) => ({
      hydrated: false,
      ...emptySession,
      setHydrated: (hydrated) => set({ hydrated }),
      setWorkspace: (localUserId, provider) =>
        set({
          localUserId,
          provider,
          command: "",
          planId: "",
          stage: "home",
          updatedAt: new Date().toISOString()
        }),
      beginFlow: (command) =>
        set({
          command: command.trim(),
          planId: "",
          stage: "processing",
          updatedAt: new Date().toISOString()
        }),
      setFlowStage: (stage, options) =>
        set((current) => ({
          stage,
          planId: options?.planId ?? current.planId,
          command: options?.command ?? current.command,
          updatedAt: new Date().toISOString()
        })),
      finishFlow: () =>
        set({
          command: "",
          planId: "",
          stage: "home",
          updatedAt: new Date().toISOString()
        }),
      clearSession: () => set({ ...emptySession, hydrated: true })
    }),
    {
      name: "moniflow-demo-session-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        localUserId: state.localUserId,
        provider: state.provider,
        command: state.command,
        planId: state.planId,
        stage: state.stage,
        updatedAt: state.updatedAt
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      }
    }
  )
);
