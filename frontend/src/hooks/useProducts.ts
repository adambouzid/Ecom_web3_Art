import { useQuery } from "@tanstack/react-query";
import type { EventLog, Log } from "ethers";
import { getProductCatalogReadOnly } from "../lib/web3";
import { getMetadata, type ProductMetadata } from "../lib/metadata";

export interface Product {
  id: number;
  vendor: string;
  metadataURI: string;
  price: string;
  quantity: number;
  active: boolean;
  metadata?: ProductMetadata;
}

const isEventLog = (log: Log | EventLog): log is EventLog => {
  return "args" in log;
};

export const fetchProducts = async (): Promise<Product[]> => {
  const catalog = getProductCatalogReadOnly();
  const createdFilter = catalog.filters.ProductCreated();
  const events = await catalog.queryFilter(createdFilter, 0, "latest");
  const ids = Array.from(
    new Set(
      events
        .map((event) => {
          if (!isEventLog(event)) return undefined;
          const value = event.args?.productId ?? event.args?.[0];
          return value ? Number(value) : undefined;
        })
        .filter((value): value is number => typeof value === "number")
    )
  );

  const products = await Promise.all(
    ids.map(async (productId) => {
      try {
        const data = await catalog.getProduct(productId);
        const metadata = await getMetadata(data.metadataURI as string);
        const product: Product = {
          id: productId,
          vendor: (data.vendor as string).toLowerCase(),
          metadataURI: data.metadataURI as string,
          price: data.price.toString(),
          quantity: Number(data.quantity),
          active: data.active as boolean,
        };
        if (metadata) {
          product.metadata = metadata;
        }
        return product;
      } catch (error) {
        console.warn("Failed to read product", productId, error);
        return null;
      }
    })
  );

  return products.filter((p): p is Product => Boolean(p));
};

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
}
