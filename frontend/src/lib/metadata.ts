export interface ProductMetadata {
  title?: string;
  description?: string;
  image?: string;
  resolvedURI?: string;
  raw?: Record<string, unknown>;
}

export const resolveMetadataUri = (uri: string) => {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`;
  }
  return uri;
};

export const fetchMetadata = async (uri: string): Promise<ProductMetadata> => {
  if (!uri) {
    throw new Error("URI manquante");
  }
  const resolvedURI = resolveMetadataUri(uri);
  const response = await fetch(resolvedURI);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const rawText = await response.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(rawText) as Record<string, unknown>;
  } catch (error) {
    const contentType = response.headers.get("content-type") ?? "inconnu";
    const snippet = rawText.trim().slice(0, 120);
    if (snippet.startsWith("<")) {
      throw new Error(
        `La ressource renvoie du HTML (content-type: ${contentType}). Assure-toi que l'URI pointe vers un JSON de metadata.`
      );
    }
    throw new Error(
      `Contenu non JSON renvoyé (content-type: ${contentType}). Aperçu indisponible. Détails: ${snippet || "(vide)"}`
    );
  }
  const title = (json["name"] ?? json["title"]) as string | undefined;
  const description = json["description"] as string | undefined;
  const imageRaw = json["image"] as string | undefined;
  const image = imageRaw ? resolveMetadataUri(imageRaw) : undefined;
  return { title, description, image, raw: json, resolvedURI };
};

const metadataCache = new Map<string, Promise<ProductMetadata | undefined>>();

export const getMetadata = (uri: string) => {
  if (!uri) return Promise.resolve(undefined);
  if (!metadataCache.has(uri)) {
    metadataCache.set(
      uri,
      fetchMetadata(uri).catch((error) => {
        console.warn("Unable to fetch metadata", uri, error);
        return undefined;
      })
    );
  }
  return metadataCache.get(uri)!;
};
