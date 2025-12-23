import { ethers } from "ethers";
import AccessControlArtifact from "../contracts/AccessControl.json";
import VendorApplicationsArtifact from "../contracts/VendorApplications.json";
import UserManagementArtifact from "../contracts/UserManagement.json";
import ProductCatalogArtifact from "../contracts/ProductCatalog.json";
import OrderManagementArtifact from "../contracts/OrderManagement.json";
import { CONTRACT_ADDRESSES } from "../contracts/contractAddresses";

const { ethereum } = window as typeof window & {
  ethereum?: ethers.Eip1193Provider;
};

const DEFAULT_RPC = "http://127.0.0.1:7545";
const rpcUrl = import.meta.env.VITE_RPC_URL ?? DEFAULT_RPC;

const patchResolveName = <T extends { resolveName?: (name: any) => Promise<string | null> }>(provider: T) => {
  const anyProvider = provider as Record<string, unknown>;
  if (anyProvider.__patchedResolveName || typeof provider.resolveName !== "function") {
    return provider;
  }
  const originalResolveName = provider.resolveName.bind(provider);
  const shouldSwallow = (error: unknown) => {
    if (!error) return false;
    if (typeof error === "object") {
      const code = (error as { code?: string }).code;
      if (code === "UNSUPPORTED_OPERATION" || code === "UNCONFIGURED_NAME") {
        return true;
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("network does not support ENS") || message.includes("UNCONFIGURED_NAME");
  };
  provider.resolveName = (async (name: any) => {
    if (typeof name === "string" && ethers.isAddress(name)) {
      return ethers.getAddress(name);
    }
    try {
      return await originalResolveName(name);
    } catch (error) {
      if (shouldSwallow(error)) {
        return null;
      }
      throw error;
    }
  }) as typeof provider.resolveName;
  anyProvider.__patchedResolveName = true;
  return provider;
};

const readOnlyProvider = patchResolveName(new ethers.JsonRpcProvider(rpcUrl));

export const getProvider = async () => {
  if (!ethereum) throw new Error("MetaMask is not available");
  const provider = patchResolveName(new ethers.BrowserProvider(ethereum));
  await provider.send("eth_requestAccounts", []);
  return provider;
};

export const getSigner = async () => {
  const provider = await getProvider();
  return provider.getSigner();
};

export const getReadOnlyProvider = () => readOnlyProvider;

const contractFactory = <T>(address: string, abi: any) => async () => {
  const signer = await getSigner();
  return new ethers.Contract(ethers.getAddress(address), abi, signer) as T;
};

const readonlyContractFactory = <T>(address: string, abi: any) => () => {
  return new ethers.Contract(ethers.getAddress(address), abi, getReadOnlyProvider()) as T;
};

export const getAccessControlReadOnly = readonlyContractFactory<ethers.Contract>(
  CONTRACT_ADDRESSES.AccessControl,
  AccessControlArtifact.abi
);
export const getVendorApplicationsReadOnly = readonlyContractFactory<ethers.Contract>(
  CONTRACT_ADDRESSES.VendorApplications,
  VendorApplicationsArtifact.abi
);
export const getAccessControl = contractFactory<ethers.Contract>(
  CONTRACT_ADDRESSES.AccessControl,
  AccessControlArtifact.abi
);
export const getVendorApplications = contractFactory<ethers.Contract>(
  CONTRACT_ADDRESSES.VendorApplications,
  VendorApplicationsArtifact.abi
);
export const getUserManagement = contractFactory<ethers.Contract>(
  CONTRACT_ADDRESSES.UserManagement,
  UserManagementArtifact.abi
);
export const getProductCatalog = contractFactory<ethers.Contract>(
  CONTRACT_ADDRESSES.ProductCatalog,
  ProductCatalogArtifact.abi
);
export const getOrderManagement = contractFactory<ethers.Contract>(
  CONTRACT_ADDRESSES.OrderManagement,
  OrderManagementArtifact.abi
);

export const getProductCatalogReadOnly = readonlyContractFactory<ethers.Contract>(
  CONTRACT_ADDRESSES.ProductCatalog,
  ProductCatalogArtifact.abi
);

export const getOrderManagementReadOnly = readonlyContractFactory<ethers.Contract>(
  CONTRACT_ADDRESSES.OrderManagement,
  OrderManagementArtifact.abi
);

