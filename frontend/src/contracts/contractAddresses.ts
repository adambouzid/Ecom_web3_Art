export const CONTRACT_ADDRESSES = {
  AccessControl: "0x467eb34E915ff3c01dAFEE96C44D35F43209B884",
  VendorApplications: "0x25256686eE29413f8fd5272Fa9E8eC0B00E5C335",
  UserManagement: "0xbfa9CaDCCd5e3bbC7aeEc2d0f99593d15Cc58EC7",
  ProductCatalog: "0x1d1511bA2c3B6A09dC12E70d991A74C690A80e19",
  OrderManagement: "0xc5dCe2430d8CE70EcB0cfa364EeD339Cdf54cfA9",
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;
