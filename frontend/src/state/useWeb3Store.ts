import { create } from "zustand";
import { getAccessControl, getSigner } from "../lib/web3";

export type UserRole = "ADMIN" | "VENDOR" | "CLIENT" | "UNREGISTERED";

interface Web3State {
  account: string | null;
  role: UserRole;
  status: "idle" | "connecting" | "connected" | "error";
  error?: string;
  connect: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const roleMap: Record<number, UserRole> = {
  0: "UNREGISTERED",
  1: "ADMIN",
  2: "VENDOR",
  3: "CLIENT",
};

export const useWeb3Store = create<Web3State>((set, get) => ({
  account: null,
  role: "UNREGISTERED",
  status: "idle",
  async connect() {
    set({ status: "connecting", error: undefined });
    try {
      const signer = await getSigner();
      const address = (await signer.getAddress()).toLowerCase();
      set({ account: address });
      await get().refreshRole();
      set({ status: "connected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      set({ status: "error", error: message });
      throw error;
    }
  },
  async refreshRole() {
    const account = get().account;
    if (!account) return;
    try {
      const accessControl = await getAccessControl();
      const onChainRole: number = await accessControl.roleOf(account);
      set({ role: roleMap[onChainRole] ?? "UNREGISTERED" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load role";
      set({ error: message });
    }
  },
}));
