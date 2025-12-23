import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAccessControl, getOrderManagement, getProductCatalog } from "../lib/web3";
import type { OrderStatus } from "./useOrders";
import { useWeb3Store } from "../state/useWeb3Store";

const handleContractError = (error: any, defaultMessage: string) => {
  if (error instanceof Error || (error && typeof error === "object")) {
    const msg = (error.message || "").toLowerCase();

    // User rejection
    if (msg.includes("rejected") || msg.includes("denied") || msg.includes("4001")) {
      toast.dismiss();
      toast.info("Transaction annulée par l'utilisateur");
      return;
    }

    // Insufficient funds
    if (msg.includes("insufficient funds") || (error as any).code === "INSUFFICIENT_FUNDS") {
      toast.error("Fonds insuffisants pour cette transaction");
      return;
    }

    // Missing revert data (Ganache/Gas estimation failed)
    if (msg.includes("missing revert data") || (error as any).code === "CALL_EXCEPTION") {
      toast.error("Échec de la transaction (fonds insuffisants ou erreur contrat)");
      return;
    }

    toast.error(error.message || defaultMessage);
  } else {
    toast.error(defaultMessage);
  }
};

interface CreateProductPayload {
  metadataURI: string;
  price: string;
  quantity: number;
}

interface CreateOrderPayload {
  productId: number;
  quantity: number;
  metadataURI: string;
  price: string;
}

interface UpdateOrderStatusPayload {
  orderId: number;
  status: OrderStatus;
}

interface UpdateProductPayload {
  productId: number;
  metadataURI: string;
  price: string;
  quantity: number;
}

interface ToggleProductActivePayload {
  productId: number;
  active: boolean;
}

const orderStatusToEnum: Record<OrderStatus, number> = {
  Pending: 0,
  Approved: 1,
  Shipped: 2,
  Cancelled: 3,
};

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ metadataURI, price, quantity }: CreateProductPayload) => {
      const catalog = await getProductCatalog();
      const tx = await catalog.createProduct(metadataURI, price, quantity);
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit créé");
    },
    onError: (error) => handleContractError(error, "Création impossible"),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, metadataURI, price, quantity }: UpdateProductPayload) => {
      const catalog = await getProductCatalog();
      const tx = await catalog.updateProduct(productId, metadataURI, price, quantity);
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit mis à jour");
    },
    onError: (error) => handleContractError(error, "Mise à jour impossible"),
  });
}

export function useToggleProductActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, active }: ToggleProductActivePayload) => {
      const catalog = await getProductCatalog();
      const tx = await catalog.setProductActive(productId, active);
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Visibilité mise à jour");
    },
    onError: (error) => handleContractError(error, "Modification impossible"),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: UpdateOrderStatusPayload) => {
      const orderManagement = await getOrderManagement();
      const tx = await orderManagement.updateStatus(orderId, orderStatusToEnum[status]);
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Statut de commande mis à jour");
    },
    onError: (error) => handleContractError(error, "Mise à jour refusée"),
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: number) => {
      const orderManagement = await getOrderManagement();
      const tx = await orderManagement.cancelOrder(orderId);
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Commande annulée");
    },
    onError: (error) => handleContractError(error, "Annulation refusée"),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, quantity, metadataURI, price }: CreateOrderPayload) => {
      const orderManagement = await getOrderManagement();
      const value = BigInt(price) * BigInt(quantity);
      const tx = await orderManagement.createOrder(productId, quantity, metadataURI, { value });
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Commande envoyée");
    },
    onError: (error) => handleContractError(error, "Commande refusée"),
  });
}

export function useRegisterClient() {
  return useMutation({
    mutationFn: async () => {
      const access = await getAccessControl();
      const tx = await access.registerClient();
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      toast.success("Compte client enregistré");
      useWeb3Store.getState().refreshRole();
    },
    onError: (error) => handleContractError(error, "Enregistrement refusé"),
  });
}

export function useGrantVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (address: string) => {
      const access = await getAccessControl();
      const tx = await access.grantVendor(address);
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Vendor accordé");
    },
    onError: (error) => handleContractError(error, "Action refusée"),
  });
}

export function useSetVendorStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ address, active }: { address: string; active: boolean }) => {
      const access = await getAccessControl();
      const tx = await access.setVendorActive(address, active);
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Statut vendeur mis à jour");
    },
    onError: (error) => handleContractError(error, "Modification impossible"),
  });
}

export function useGrantAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (address: string) => {
      const access = await getAccessControl();
      const tx = await access.grantAdmin(address);
      await tx.wait();
      return tx.hash as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Admin accordé");
    },
    onError: (error) => handleContractError(error, "Action refusée"),
  });
}
