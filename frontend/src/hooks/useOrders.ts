import { useQuery } from "@tanstack/react-query";
import type { EventLog, Log } from "ethers";
import { getOrderManagementReadOnly, getReadOnlyProvider } from "../lib/web3";

export type OrderStatus = "Pending" | "Approved" | "Shipped" | "Cancelled";

export interface Order {
  id: number;
  buyer: string;
  vendor: string;
  productId: number;
  quantity: number;
  totalPrice: string;
  status: OrderStatus;
  metadataURI: string;
  txHash?: string;
  createdAt?: number;
}

const statusMap: Record<number, OrderStatus> = {
  0: "Pending",
  1: "Approved",
  2: "Shipped",
  3: "Cancelled",
};

const isEventLog = (log: Log | EventLog): log is EventLog => {
  return "args" in log;
};

export const fetchOrders = async (): Promise<Order[]> => {
  const contract = getOrderManagementReadOnly();
  const createdEvents = await contract.queryFilter(contract.filters.OrderCreated(), 0, "latest");
  const provider = getReadOnlyProvider();
  const blockTimestampCache = new Map<number, Promise<number | undefined>>();
  const createdEventMap = new Map<number, EventLog>();

  createdEvents.forEach((event) => {
    if (!isEventLog(event)) return;
    const value = event.args?.orderId ?? event.args?.[0];
    if (!value) return;
    const id = Number(value);
    if (!Number.isFinite(id)) return;
    createdEventMap.set(id, event);
  });
  const ids = Array.from(
    new Set(
      createdEvents
        .map((event) => {
          if (!isEventLog(event)) return undefined;
          const value = event.args?.orderId ?? event.args?.[0];
          return value ? Number(value) : undefined;
        })
        .filter((value): value is number => typeof value === "number")
    )
  );

  const orders = await Promise.all(
    ids.map(async (id) => {
      try {
        const raw = await contract.getOrder(id);
        const createdEvent = createdEventMap.get(id);
        const txHash = createdEvent?.transactionHash;
        let createdAt: number | undefined;
        if (createdEvent) {
          const blockNumber = createdEvent.blockNumber;
          if (!blockTimestampCache.has(blockNumber)) {
            blockTimestampCache.set(
              blockNumber,
              provider
                .getBlock(blockNumber)
                .then((block) => (block?.timestamp ? Number(block.timestamp) * 1000 : undefined))
                .catch(() => undefined)
            );
          }
          createdAt = await blockTimestampCache.get(blockNumber);
        }
        const order: Order = {
          id,
          buyer: (raw.buyer as string).toLowerCase(),
          vendor: (raw.vendor as string).toLowerCase(),
          productId: Number(raw.productId),
          quantity: Number(raw.quantity),
          totalPrice: raw.totalPrice.toString(),
          status: statusMap[Number(raw.status)] ?? "Pending",
          metadataURI: raw.metadataURI as string,
          txHash,
          createdAt,
        };
        return order;
      } catch (error) {
        console.warn("Unable to read order", id, error);
        return null;
      }
    })
  );

  return orders.filter((order): order is Order => Boolean(order));
};

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
}
