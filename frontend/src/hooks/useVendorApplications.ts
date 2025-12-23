import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { EventLog, Log } from "ethers";
import { formatEther } from "ethers";
import {
  getVendorApplications,
  getVendorApplicationsReadOnly,
} from "../lib/web3";
import { getMetadata } from "../lib/metadata";

export type VendorApplicationStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export interface VendorApplication {
  applicant: string;
  metadataURI: string;
  stakeWei: string;
  stakeEth: string;
  status: VendorApplicationStatus;
  metadata?: Awaited<ReturnType<typeof getMetadata>>;
}

const statusMap: Record<number, VendorApplicationStatus> = {
  0: "NONE",
  1: "PENDING",
  2: "APPROVED",
  3: "REJECTED",
};

const isEventLog = (log: Log | EventLog): log is EventLog => "args" in log;

export const fetchVendorApplication = async (applicant: string): Promise<VendorApplication | null> => {
  if (!applicant) return null;
  const contract = getVendorApplicationsReadOnly();
  const [raw, stakeRequired] = await Promise.all([
    contract.getApplication(applicant),
    contract.STAKE_REQUIRED(),
  ]);
  const status = statusMap[Number(raw.status)] ?? "NONE";
  if (status === "NONE" && !raw.metadataURI) {
    return null;
  }
  const stake = raw.stake && BigInt(raw.stake) > 0 ? BigInt(raw.stake) : BigInt(stakeRequired);
  const application: VendorApplication = {
    applicant: applicant.toLowerCase(),
    metadataURI: (raw.metadataURI as string) ?? "",
    stakeWei: stake.toString(),
    stakeEth: formatEther(stake),
    status,
  };
  if (application.metadataURI) {
    const metadata = await getMetadata(application.metadataURI).catch(() => undefined);
    if (metadata) {
      application.metadata = metadata;
    }
  }
  return application;
};

export const fetchVendorApplications = async (): Promise<VendorApplication[]> => {
  const contract = getVendorApplicationsReadOnly();
  const appliedEvents = await contract.queryFilter(contract.filters.VendorApplied(), 0, "latest");
  const applicants = new Set<string>();
  appliedEvents.forEach((event) => {
    if (!isEventLog(event)) return;
    const applicant = (event.args?.applicant ?? event.args?.[0]) as string | undefined;
    if (applicant) {
      applicants.add(applicant.toLowerCase());
    }
  });

  const entries = await Promise.all(
    Array.from(applicants).map(async (candidate) => fetchVendorApplication(candidate).catch(() => null))
  );

  return entries.filter((entry): entry is VendorApplication => Boolean(entry));
};

export function useVendorApplications() {
  return useQuery({ queryKey: ["vendor-applications"], queryFn: fetchVendorApplications });
}

export function useVendorApplication(applicant?: string | null) {
  return useQuery({
    queryKey: ["vendor-application", applicant?.toLowerCase()],
    queryFn: () => fetchVendorApplication(applicant!.toLowerCase()),
    enabled: Boolean(applicant),
  });
}

export const fetchVendorStake = async (): Promise<string> => {
  const contract = getVendorApplicationsReadOnly();
  const stake = await contract.STAKE_REQUIRED();
  return stake.toString();
};

export function useVendorStake() {
  return useQuery({ queryKey: ["vendor-stake"], queryFn: fetchVendorStake });
}

export function useApplyAsVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (metadataURI: string) => {
      const contract = await getVendorApplications();
      const stake = await contract.STAKE_REQUIRED();
      const tx = await contract.applyAsVendor(metadataURI, { value: stake });
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-applications"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-application"] });
      toast.success("Candidature envoyée");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Transaction refusée";
      toast.error(message);
    },
  });
}

export function useApproveVendorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicant: string) => {
      const contract = await getVendorApplications();
      const tx = await contract.approveVendor(applicant);
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-applications"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Candidature acceptée");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Action refusée";
      toast.error(message);
    },
  });
}

export function useRejectVendorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicant: string) => {
      const contract = await getVendorApplications();
      const tx = await contract.rejectVendor(applicant);
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-applications"] });
      toast.success("Candidature rejetée et remboursée");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Action refusée";
      toast.error(message);
    },
  });
}
