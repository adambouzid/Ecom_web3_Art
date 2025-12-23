const API_BASE = import.meta.env.VITE_METADATA_API ?? "http://localhost:4000";

export interface MetadataDraft {
  name: string;
  description: string;
  image?: string;
  extra?: Record<string, unknown>;
}

// Legacy: Upload image to disk storage
export const uploadImageFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }
  const data = (await response.json()) as { url?: string; error?: string };
  if (!data.url) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.url;
};

// NEW: Upload image to MongoDB
export const uploadImageToMongo = async (file: File): Promise<{ id: string; url: string }> => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Image upload failed (${response.status})`);
  }
  const data = (await response.json()) as { id?: string; url?: string; error?: string };
  if (!data.id || !data.url) {
    throw new Error(data.error ?? "Image upload failed");
  }
  return { id: data.id, url: data.url };
};

// NEW: Create product with image in one call (no URI needed)
export const createProductWithImage = async (params: {
  productId: number;
  title: string;
  description: string;
  image?: File;
}): Promise<{ productId: number; imageUrl: string | null }> => {
  const formData = new FormData();
  formData.append("productId", params.productId.toString());
  formData.append("title", params.title);
  formData.append("description", params.description);
  if (params.image) {
    formData.append("image", params.image);
  }

  const response = await fetch(`${API_BASE}/api/products`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Product creation failed (${response.status})`);
  }
  const data = (await response.json()) as { productId?: number; imageUrl?: string; error?: string };
  return {
    productId: data.productId ?? params.productId,
    imageUrl: data.imageUrl ?? null
  };
};

// NEW: Get product image URL
export const getProductImageUrl = async (productId: number): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/products/${productId}/image`);
    if (!response.ok) return null;
    const data = (await response.json()) as { imageUrl?: string };
    return data.imageUrl ?? null;
  } catch {
    return null;
  }
};

// Legacy: Create metadata URI
export const createMetadataUri = async (draft: MetadataDraft): Promise<string> => {
  const response = await fetch(`${API_BASE}/metadata`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(draft),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error ?? `Metadata endpoint failed (${response.status})`);
  }
  const data = (await response.json()) as { uri?: string; error?: string };
  if (!data.uri) {
    throw new Error(data.error ?? "Metadata creation failed");
  }
  return data.uri;
};
