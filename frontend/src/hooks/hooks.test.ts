import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchProducts } from "./useProducts";
import { fetchOrders } from "./useOrders";

const mockCatalog = {
  filters: {
    ProductCreated: vi.fn(() => "filter"),
  },
  queryFilter: vi.fn(),
  getProduct: vi.fn(),
};

const mockOrderContract = {
  filters: {
    OrderCreated: vi.fn(() => "order-filter"),
  },
  queryFilter: vi.fn(),
  getOrder: vi.fn(),
};

const mockProvider = {
  getBlock: vi.fn(),
};

const mockGetMetadata = vi.fn();

vi.mock("../lib/web3", () => ({
  getProductCatalogReadOnly: () => mockCatalog,
  getOrderManagementReadOnly: () => mockOrderContract,
  getReadOnlyProvider: () => mockProvider,
}));

vi.mock("../lib/metadata", () => ({
  getMetadata: (uri: string) => mockGetMetadata(uri),
}));

describe("data fetch hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchProducts aggregates unique products and merges metadata", async () => {
    const productEvents = [
      { args: { productId: 1 } },
      { args: { productId: 2 } },
      { args: { productId: 1 } },
    ];
    mockCatalog.queryFilter.mockResolvedValue(productEvents);
    mockCatalog.getProduct.mockImplementation(async (id: number) => {
      if (id === 2) {
        return {
          vendor: "0xVendorB",
          metadataURI: "uri-2",
          price: { toString: () => "200" },
          quantity: 5,
          active: true,
        };
      }
      return {
        vendor: "0xVendorA",
        metadataURI: "uri-1",
        price: { toString: () => "100" },
        quantity: 10,
        active: true,
      };
    });
    mockGetMetadata.mockImplementation(async (uri: string) => {
      if (uri === "uri-1") return { title: "Product One" };
      return undefined;
    });

    const products = await fetchProducts();
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      id: 1,
      vendor: "0xvendora",
      metadataURI: "uri-1",
      metadata: { title: "Product One" },
    });
    expect(products[1]).toMatchObject({
      id: 2,
      vendor: "0xvendorb",
      metadataURI: "uri-2",
    });
    expect(mockCatalog.getProduct).toHaveBeenCalledTimes(2);
    expect(mockGetMetadata).toHaveBeenCalledTimes(2);
  });

  it("fetchOrders decorates orders with tx hash and timestamp", async () => {
    const now = 1_725_000_000;
    const orderEvents = [
      { args: { orderId: 7 }, blockNumber: 123, transactionHash: "0xabc" },
    ];
    mockOrderContract.queryFilter.mockResolvedValue(orderEvents);
    mockOrderContract.getOrder.mockResolvedValue({
      buyer: "0xBuyer",
      vendor: "0xVendor",
      productId: 3,
      quantity: 2,
      totalPrice: { toString: () => "500" },
      status: 1,
      metadataURI: "ipfs://order",
    });
    mockProvider.getBlock.mockResolvedValue({ timestamp: now });

    const orders = await fetchOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      id: 7,
      buyer: "0xbuyer",
      vendor: "0xvendor",
      status: "Approved",
      txHash: "0xabc",
      createdAt: now * 1000,
    });
    expect(mockProvider.getBlock).toHaveBeenCalledWith(123);
  });
});
