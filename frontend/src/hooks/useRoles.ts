import { useQuery } from "@tanstack/react-query";
import { getAccessControlReadOnly } from "../lib/web3";
import type { UserRole } from "../state/useWeb3Store";
import type { EventLog, Log } from "ethers";

export interface RoleDirectoryEntry {
  address: string;
  role: UserRole;
  vendorActive: boolean;
}

const roleMap: Record<number, UserRole> = {
  0: "UNREGISTERED",
  1: "ADMIN",
  2: "VENDOR",
  3: "CLIENT",
};

const isEventLog = (log: Log | EventLog): log is EventLog => {
  return "args" in log;
};

const fetchRoleDirectory = async (): Promise<RoleDirectoryEntry[]> => {
  const access = getAccessControlReadOnly();
  const [grantedEvents, revokedEvents] = await Promise.all([
    access.queryFilter(access.filters.RoleGranted(), 0, "latest"),
    access.queryFilter(access.filters.RoleRevoked(), 0, "latest"),
  ]);

  const addresses = new Set<string>();
  [...grantedEvents, ...revokedEvents].forEach((event) => {
    if (!isEventLog(event)) return;
    const account = (event.args?.account ?? event.args?.[0]) as string | undefined;
    if (account) {
      addresses.add(account.toLowerCase());
    }
  });

  const directory = await Promise.all(
    Array.from(addresses).map(async (address) => {
      const roleValue = Number(await access.roleOf(address));
      const role = roleMap[roleValue] ?? "UNREGISTERED";
      const vendorActive = role === "VENDOR" ? await access.vendorActive(address) : false;
      return { address, role, vendorActive };
    })
  );

  return directory.filter((entry) => entry.role !== "UNREGISTERED");
};

export function useRoleDirectory() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoleDirectory,
    refetchOnWindowFocus: false,
  });
}
