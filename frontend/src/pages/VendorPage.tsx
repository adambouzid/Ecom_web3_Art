import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { formatEther, formatUnits, parseEther } from "ethers";
import { useWeb3Store, type UserRole } from "../state/useWeb3Store";
import { useCreateProduct, useToggleProductActive, useUpdateProduct, useRegisterClient, useUpdateOrderStatus } from "../hooks/useContract";
import { useOrders } from "../hooks/useOrders";
import {
  useApplyAsVendor,
  useVendorApplication,
  useVendorStake,
  type VendorApplication,
  type VendorApplicationStatus,
} from "../hooks/useVendorApplications";
import { Product, useProducts } from "../hooks/useProducts";
import { fetchMetadata, ProductMetadata, resolveMetadataUri } from "../lib/metadata";
import { createMetadataUri, uploadImageFile, uploadImageToMongo, type MetadataDraft } from "../lib/metadataClient";

const EMPTY_APPLICATION_FORM = {
  metadataURI: "",
  brandName: "",
  pitch: "",
  imageFile: null as File | null,
};

type ApplicationFormState = typeof EMPTY_APPLICATION_FORM;
type UploadStatus = "idle" | "uploading" | "error" | "ready";

const STATUS_BADGES: Record<VendorApplicationStatus, { label: string; tone: string }> = {
  NONE: { label: "Aucune candidature", tone: "border-[#5c4033] bg-[#2e261e] text-[#d4c4a8]" },
  PENDING: { label: "Candidature en attente", tone: "border-amber-300 bg-amber-50 text-amber-700" },
  APPROVED: { label: "Vendor actif", tone: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Candidature rejetée", tone: "border-rose-300 bg-rose-50 text-rose-700" },
};

const ADMIN_BADGE = { label: "Mode admin", tone: "border-indigo-300 bg-indigo-50 text-indigo-700" };

export function VendorPage() {
  const { role, account, connect, status, refreshRole } = useWeb3Store();
  const vendorStake = useVendorStake();
  const applyAsVendor = useApplyAsVendor();
  const registerClient = useRegisterClient();
  const applicant = account ?? undefined;
  const {
    data: application,
    isLoading: applicationLoading,
    refetch: refetchApplication,
  } = useVendorApplication(applicant);
  const isConnected = Boolean(account);
  const isVendor = role === "VENDOR";
  const isAdmin = role === "ADMIN";

  const [applicationForm, setApplicationForm] = useState<ApplicationFormState>({ ...EMPTY_APPLICATION_FORM });
  const [appImagePreview, setAppImagePreview] = useState<string | null>(null);
  const [applicationMessage, setApplicationMessage] = useState<string | null>(null);
  const [metadataStatus, setMetadataStatus] = useState<UploadStatus>("idle");
  const [metadataError, setMetadataError] = useState<string | null>(null);

  useEffect(() => {
    setApplicationForm({ ...EMPTY_APPLICATION_FORM });
    setAppImagePreview(null);
    setApplicationMessage(null);
    setMetadataStatus("idle");
    setMetadataError(null);
  }, [account]);

  const stakeInfo = useMemo(() => {
    if (!vendorStake.data || vendorStake.isError) {
      return { formatted: "5 ETH", value: "5" };
    }
    try {
      const parsed = Number.parseFloat(formatEther(vendorStake.data));
      if (!Number.isFinite(parsed)) {
        return { formatted: "5 ETH", value: "5" };
      }
      return {
        formatted: `${parsed.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ETH`,
        value: parsed.toString(),
      };
    } catch (error) {
      console.warn("Unable to format vendor stake", error);
      return { formatted: "5 ETH", value: "5" };
    }
  }, [vendorStake.data, vendorStake.isError]);

  const statusBadge = useMemo(() => {
    if (!isConnected) return null;
    if (isAdmin) return ADMIN_BADGE;
    if (isVendor) return STATUS_BADGES.APPROVED;
    return STATUS_BADGES[application?.status ?? "NONE"];
  }, [application?.status, isAdmin, isConnected, isVendor]);

  const applicationExtras = useMemo(() => {
    const raw = application?.metadata?.raw?.["extra"];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [] as Array<[string, string]>;
    return Object.entries(raw as Record<string, unknown>).filter((entry): entry is [string, string] => {
      const value = entry[1];
      return typeof value === "string" && value.trim().length > 0;
    });
  }, [application?.metadata]);

  useEffect(() => {
    if (application?.status === "APPROVED" && !isVendor) {
      refreshRole().catch(() => undefined);
    }
  }, [application?.status, isVendor, refreshRole]);

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setApplicationForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAppImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setApplicationForm((prev) => ({ ...prev, imageFile: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setAppImagePreview(url);
    } else {
      setAppImagePreview(null);
    }
  };

  const handleApplicationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApplicationMessage(null);
    setMetadataError(null);

    let metadataURI = applicationForm.metadataURI.trim();
    if (!metadataURI) {
      if (!applicationForm.brandName.trim() || !applicationForm.pitch.trim()) {
        setApplicationMessage("Merci de renseigner au minimum le nom de ta marque et ton pitch.");
        return;
      }
      setMetadataStatus("uploading");
      try {
        let imageUrl = "";
        if (applicationForm.imageFile) {
          const result = await uploadImageToMongo(applicationForm.imageFile);
          imageUrl = result.url;
        }

        const draft: MetadataDraft = {
          name: applicationForm.brandName.trim(),
          description: applicationForm.pitch.trim(),
          image: imageUrl
        };
        metadataURI = await createMetadataUri(draft);
        setMetadataStatus("ready");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de générer la metadata";
        setMetadataStatus("error");

        let displayMessage = message;
        if (message.includes("Failed to fetch") || message.includes("upload failed")) {
          displayMessage = "Erreur connexion backend. Vérifiez le terminal 'backend' (port 4000).";
        }

        setMetadataError(displayMessage);
        setApplicationMessage(displayMessage);
        return;
      }
    }

    try {
      await applyAsVendor.mutateAsync(metadataURI);
      setApplicationMessage("Candidature envoyée. Confirme la transaction dans ton wallet.");
      setApplicationForm({ ...EMPTY_APPLICATION_FORM });
      setAppImagePreview(null);
      setMetadataStatus("idle");
      await refetchApplication();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transaction refusée";
      setApplicationMessage(message);
    }
  };

  const stakeText = vendorStake.isLoading ? "Chargement…" : stakeInfo.formatted;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 group">
      <div className="card p-8 bg-[#1f1b16] border-[#3d2b1f] border rounded-xl shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#c9a96e]">Vendor onboarding</p>
            <h1 className="text-3xl font-display text-[#f4e8d3] font-serif italic">Espace vendeur</h1>
            <p className="text-sm text-[#a08060]">
              Dépose ton dossier. Un stake de {stakeText} est immobilisé jusqu’à validation par un admin.
            </p>
          </div>
          {statusBadge && (
            <span className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${statusBadge.tone?.replace('border-emerald-300 bg-emerald-50 text-emerald-700', 'border-emerald-900 bg-emerald-900/20 text-emerald-400')}`}>
              {statusBadge.label}
            </span>
          )}
        </div>
        {isConnected && application?.metadataURI && (
          <p className="mt-3 break-all text-xs text-[#6b5a48]">
            Dernière metadata :
            <a
              href={resolveMetadataUri(application.metadataURI)}
              target="_blank"
              rel="noreferrer"
              className="ml-2 underline hover:text-[#c9a96e]"
            >
              Link
            </a>
          </p>
        )}
      </div>

      {!isConnected && (
        <div className="card space-y-4 p-8 text-center bg-[#1f1b16] border-[#3d2b1f] border rounded-xl">
          <h2 className="text-2xl font-display text-[#f4e8d3]">Connecte ton wallet</h2>
          <p className="text-sm text-[#a08060]">Tu dois connecter un wallet EVM pour candidater.</p>
          <button className="btn-primary mx-auto w-full sm:w-auto bg-[#c9a96e] text-[#1a1410] hover:bg-[#d4b87a] px-6 py-3 font-serif rounded-lg transition-colors" onClick={() => connect()} disabled={status === "connecting"}>
            {status === "connecting" ? "Connexion…" : "Connecter mon wallet"}
          </button>
        </div>
      )}

      {isConnected && role === "UNREGISTERED" && (
        <div className="card space-y-4 p-8 text-center bg-[#1f1b16] border-[#3d2b1f] border rounded-xl">
          <h2 className="text-2xl font-display text-[#f4e8d3]">Créer un compte client</h2>
          <p className="text-sm text-[#a08060]">Tu dois d'abord être enregistré comme client avant de pouvoir devenir vendeur.</p>
          <button
            className="btn-primary mx-auto w-full sm:w-auto bg-[#c9a96e] text-[#1a1410] hover:bg-[#d4b87a] px-6 py-3 font-serif rounded-lg transition-colors"
            onClick={() => registerClient.mutate()}
            disabled={registerClient.isPending}
          >
            {registerClient.isPending ? "Création en cours..." : "Créer mon compte"}
          </button>
          {registerClient.error && (
            <p className="text-xs text-red-400 mt-2">{registerClient.error.message}</p>
          )}
        </div>
      )}

      {isConnected && !isVendor && !isAdmin && applicationLoading && (
        <div className="card p-6 text-sm text-[#a08060] bg-[#1f1b16] border-[#3d2b1f] border rounded-xl">Chargement de ta candidature…</div>
      )}

      {isConnected && !isVendor && !isAdmin && application?.status === "PENDING" && (
        <div className="card space-y-4 p-6 bg-[#1f1b16] border-[#3d2b1f] border rounded-xl">
          <div className="space-y-1">
            <h2 className="text-xl font-display text-[#f4e8d3]">Candidature en revue</h2>
            <p className="text-sm text-[#a08060]">
              Ton stake de {application.stakeEth} ETH est verrouillé. Un admin te répondra bientôt.
            </p>
          </div>
          {application.metadata && <ApplicationSummary application={application} extras={applicationExtras} />}
        </div>
      )}

      {isConnected && !isVendor && !isAdmin && application?.status === "APPROVED" && (
        <div className="card space-y-4 p-6 bg-[#1f1b16] border-[#3d2b1f] border rounded-xl">
          <h2 className="text-xl font-display text-emerald-400">Candidature acceptée 🎉</h2>
          <p className="text-sm text-[#a08060]">Ton rôle vendeur devrait s’activer. Rafraîchis au besoin.</p>
          <button className="btn-primary w-full sm:w-auto bg-[#c9a96e] text-[#1a1410] px-6 py-2 rounded-lg" onClick={() => refreshRole()}>
            Rafraîchir mon rôle
          </button>
        </div>
      )}

      {isConnected && !isVendor && !isAdmin && application?.status === "REJECTED" && (
        <div className="card space-y-4 border border-rose-900/50 bg-rose-900/10 p-6 rounded-xl">
          <h2 className="text-xl font-display text-rose-400">Candidature rejetée</h2>
          <p className="text-sm text-rose-300">Ton stake a été remboursé. Ajuste ton dossier et retente.</p>
          {application.metadata && <ApplicationSummary application={application} extras={applicationExtras} />}
        </div>
      )}

      {isConnected &&
        !isVendor &&
        !isAdmin &&
        role !== "UNREGISTERED" &&
        (!application || application.status === "NONE" || application.status === "REJECTED") && (
          <form className="card space-y-5 p-8 bg-[#1f1b16] border-[#3d2b1f] border rounded-xl shadow-xl" onSubmit={handleApplicationSubmit}>
            <div className="space-y-2">
              <h2 className="text-2xl font-display text-[#f4e8d3]">Déposer une candidature</h2>
              <p className="text-sm text-[#a08060]">
                Présente ton activité. La signature engagera {stakeInfo.formatted} sur le contrat.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block space-y-2">
                <span className="text-sm text-[#a08060]">Image de marque / Logo</span>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#5c4033] bg-[#2e261e] rounded-xl cursor-pointer hover:border-[#8b7355] transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <span className="text-2xl text-[#8b7355]">+</span>
                        <p className="text-sm text-[#8b7355]">
                          {applicationForm.imageFile ? applicationForm.imageFile.name : "Ajouter une image"}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAppImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {appImagePreview && (
                    <div className="w-32 h-32 rounded-xl border border-[#5c4033] overflow-hidden bg-black/40">
                      <img src={appImagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-[#a08060]">Nom de la marque *</span>
                <input
                  name="brandName"
                  value={applicationForm.brandName}
                  onChange={handleFieldChange}
                  placeholder="Ex: Les Gourmandises Web3"
                  className="w-full rounded-xl border border-[#5c4033] bg-[#2e261e] px-4 py-3 text-sm text-[#f4e8d3] outline-none focus:border-[#c9a96e]"
                  required={!applicationForm.metadataURI}
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm text-[#a08060]">Pitch / proposition de valeur *</span>
              <textarea
                name="pitch"
                value={applicationForm.pitch}
                onChange={handleFieldChange}
                rows={3}
                placeholder="Explique ce que tu vends et ta différenciation"
                className="w-full rounded-xl border border-[#5c4033] bg-[#2e261e] px-4 py-3 text-sm text-[#f4e8d3] outline-none focus:border-[#c9a96e] resize-none"
                required={!applicationForm.metadataURI}
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                className="btn-primary px-6 py-3 bg-[#c9a96e] text-[#1a1410] rounded-lg hover:bg-[#d4b87a] disabled:opacity-50"
                type="submit"
                disabled={applyAsVendor.isPending || metadataStatus === "uploading"}
              >
                {applyAsVendor.isPending || metadataStatus === "uploading"
                  ? "Signature en cours…"
                  : `Déposer ma candidature (${stakeInfo.formatted})`}
              </button>
              <p className="text-xs text-[#a08060]">Stake remboursé en cas de rejet par un admin.</p>
            </div>
            {metadataStatus === "uploading" && <p className="text-xs text-[#a08060]">Génération de la metadata…</p>}
            {metadataError && <p className="text-xs text-[#c97a7a]">{metadataError}</p>}
            {applicationMessage && <p className="text-sm text-[#d4c4a8]">{applicationMessage}</p>}
          </form>
        )}

      {(isVendor || isAdmin) && account && <VendorWorkbench account={account} role={role} />}
    </div>
  );
}



function VendorWorkbench({ account, role }: { account: string; role: UserRole }) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const toggleProductActive = useToggleProductActive();
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useProducts();
  const { data: allOrders, refetch: refetchOrders } = useOrders();
  const updateOrderStatus = useUpdateOrderStatus(); // Hook needed for actions

  // Tab State
  const [activeTab, setActiveTab] = useState<"atelier" | "products" | "orders">(() => {
    // Simple URL param parsing for deep linking
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "orders" || tab === "products" || tab === "atelier") return tab;
    }
    return "atelier";
  });

  const vendorProducts = useMemo(() => {
    if (!products) return [] as Product[];
    return products.filter((product) => role === "ADMIN" || product.vendor.toLowerCase() === account.toLowerCase());
  }, [products, role, account]);

  const stats = useMemo(() => {
    if (!allOrders || !account) return { revenue: 0n, count: 0, items: 0 };
    const relevantOrders = allOrders.filter(o =>
      o.vendor.toLowerCase() === account.toLowerCase() &&
      o.status !== "Cancelled"
    );

    const revenue = relevantOrders.reduce((acc, o) => acc + BigInt(o.totalPrice), 0n);
    const items = relevantOrders.reduce((acc, o) => acc + o.quantity, 0);

    return { revenue, count: relevantOrders.length, items };
  }, [allOrders, account]);

  // Vendor Orders
  const incomingOrders = useMemo(() => {
    if (!allOrders || !account) return [];
    return allOrders.filter((order) => order.vendor.toLowerCase() === account.toLowerCase())
      .sort((a, b) => b.id - a.id); // Newest first
  }, [allOrders, account]);

  // Form State (for Atelier)
  const [form, setForm] = useState({
    name: "",
    description: "",
    priceEth: "",
    quantity: 1,
    imageFile: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, imageFile: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (role === "ADMIN") {
      setFeedback("Les administrateurs ne peuvent pas créer de produits.");
      return;
    }

    if (!form.name.trim() || !form.description.trim()) {
      setFeedback("Veuillez remplir le nom et la description du produit.");
      return;
    }

    if (!form.priceEth || parseFloat(form.priceEth) <= 0) {
      setFeedback("Veuillez entrer un prix valide.");
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = "";
      if (form.imageFile) {
        const result = await uploadImageToMongo(form.imageFile);
        imageUrl = result.url;
      }

      const metadataURI = await createMetadataUri({
        name: form.name.trim(),
        description: form.description.trim(),
        image: imageUrl,
      });

      await createProduct.mutateAsync({
        metadataURI,
        price: parseEther(form.priceEth || "0").toString(),
        quantity: Number(form.quantity),
      });

      setForm({ name: "", description: "", priceEth: "", quantity: 1, imageFile: null });
      setImagePreview(null);
      setFeedback("✓ Produit créé avec succès!");
      refetchProducts();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de la création";
      setFeedback(`✗ ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for Order Actions
  const handleOrderStatus = async (orderId: number, status: "Approved" | "Shipped") => {
    try {
      await updateOrderStatus.mutateAsync({ orderId, status });
      refetchOrders();
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "Pending": return { label: "À Valider", color: "text-yellow-400", bg: "bg-yellow-900/30" };
      case "Approved": return { label: "À Expédier", color: "text-blue-400", bg: "bg-blue-900/30" };
      case "Shipped": return { label: "Expédiée", color: "text-green-400", bg: "bg-green-900/30" };
      case "Cancelled": return { label: "Annulée", color: "text-red-400", bg: "bg-red-900/30" };
      default: return { label: status, color: "text-gray-400", bg: "bg-gray-800" };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Tab Navigation */}
      <div className="flex border-b border-[#3d2b1f] gap-8">
        <button
          onClick={() => setActiveTab("atelier")}
          className={`pb-4 px-2 text-sm font-serif italic tracking-wide transition-colors border-b-2 ${activeTab === "atelier" ? "border-[#c9a96e] text-[#f4e8d3]" : "border-transparent text-[#8b7355] hover:text-[#d4c4a8]"}`}
        >
          🔨 L'Atelier
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-4 px-2 text-sm font-serif italic tracking-wide transition-colors border-b-2 ${activeTab === "products" ? "border-[#c9a96e] text-[#f4e8d3]" : "border-transparent text-[#8b7355] hover:text-[#d4c4a8]"}`}
        >
          🖼️ Mes Œuvres
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-4 px-2 text-sm font-serif italic tracking-wide transition-colors border-b-2 ${activeTab === "orders" ? "border-[#c9a96e] text-[#f4e8d3]" : "border-transparent text-[#8b7355] hover:text-[#d4c4a8]"}`}
        >
          📦 Commandes ({incomingOrders.filter(o => o.status === "Pending" || o.status === "Approved").length})
        </button>
      </div>

      {/* TAB 1: ATELIER (Stats + Create) */}
      {activeTab === "atelier" && (
        <div className="space-y-8">
          {/* Statistics Dashboard */}
          {role === "VENDOR" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 border border-[#3d2b1f] bg-[#1f1b16] rounded-xl flex flex-col items-center justify-center text-center shadow-lg">
                <p className="text-[#a08060] text-xs uppercase tracking-widest mb-2">Chiffre d'Affaires</p>
                <p className="text-3xl font-serif text-[#f4e8d3] italic">{formatEther(stats.revenue)} ETH</p>
              </div>
              <div className="card p-6 border border-[#3d2b1f] bg-[#1f1b16] rounded-xl flex flex-col items-center justify-center text-center shadow-lg">
                <p className="text-[#a08060] text-xs uppercase tracking-widest mb-2">Ventes Totales</p>
                <p className="text-3xl font-serif text-[#f4e8d3] italic">{stats.count}</p>
              </div>
              <div className="card p-6 border border-[#3d2b1f] bg-[#1f1b16] rounded-xl flex flex-col items-center justify-center text-center shadow-lg">
                <p className="text-[#a08060] text-xs uppercase tracking-widest mb-2">Pièces Vendues</p>
                <p className="text-3xl font-serif text-[#f4e8d3] italic">{stats.items}</p>
              </div>
            </div>
          )}

          {/* Create Product Card */}
          {role === "VENDOR" ? (
            <div className="card p-6 border border-[#3d2b1f] bg-[#1f1b16] rounded-xl shadow-xl">
              <div className="mb-6 border-b border-[#3d2b1f] pb-4">
                <p className="text-xs uppercase tracking-[0.35em] text-[#c9a96e]">Nouveau produit</p>
                <h2 className="mt-2 text-2xl font-serif text-[#f4e8d3] italic">Ajouter une œuvre</h2>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#d4c4a8]">
                    Nom de l'œuvre <span className="text-[#c9a96e]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Vase Renaissance"
                    className="w-full rounded-lg border border-[#5c4033] bg-[#2e261e] px-4 py-3 text-[#f4e8d3] focus:border-[#c9a96e] outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#d4c4a8]">
                    Description <span className="text-[#c9a96e]">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-[#5c4033] bg-[#2e261e] px-4 py-3 text-[#f4e8d3] focus:border-[#c9a96e] outline-none resize-none"
                    required
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#d4c4a8]">
                      Prix (ETH) <span className="text-[#c9a96e]">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={form.priceEth}
                      onChange={(e) => setForm((prev) => ({ ...prev, priceEth: e.target.value }))}
                      className="w-full rounded-lg border border-[#5c4033] bg-[#2e261e] px-4 py-3 text-[#f4e8d3] focus:border-[#c9a96e] outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#d4c4a8]">Quantité</label>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-[#5c4033] bg-[#2e261e] px-4 py-3 text-[#f4e8d3] focus:border-[#c9a96e] outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#d4c4a8]">Image</label>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="text-[#a08060] text-sm" />
                  {imagePreview && (
                    <div className="w-32 h-32 rounded-lg overflow-hidden border border-[#5c4033] mt-2">
                      <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || createProduct.isPending}
                  className="w-full py-3 px-6 rounded-lg bg-[#c9a96e] text-[#1a1410] font-serif italic hover:bg-[#d4b87a] disabled:opacity-50"
                >
                  {isSubmitting ? "Création..." : "Publier l'Œuvre"}
                </button>
                {feedback && <p className="text-sm text-[#d4c4a8]">{feedback}</p>}
              </form>
            </div>
          ) : (
            <div className="card p-6 border border-[#3d2b1f] bg-[#1f1b16] rounded-xl text-center">
              <p className="text-[#a08060]">Admin View (Form Hidden)</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MES ŒUVRES (Product List) */}
      {activeTab === "products" && (
        <div className="card p-6 border border-[#3d2b1f] bg-[#1f1b16] rounded-xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-serif text-[#f4e8d3] italic">Mes œuvres</h3>
              <p className="text-sm text-[#a08060]">{vendorProducts.length} pièce(s) dans votre collection</p>
            </div>
            <button
              onClick={() => refetchProducts()}
              className="text-sm text-[#c9a96e] hover:text-[#d4b87a] transition-colors"
            >
              Actualiser
            </button>
          </div>

          {productsLoading && <p className="text-sm text-[#a08060]">Chargement...</p>}
          {!productsLoading && vendorProducts.length === 0 && (
            <p className="text-sm text-[#6b5a48] text-center py-8">Aucun produit. Allez dans l'onglet "L'Atelier" pour en créer.</p>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vendorProducts.map((product) => (
              <SimpleProductCard
                key={product.id}
                product={product}
                onUpdate={async (payload) => { await updateProduct.mutateAsync(payload); }}
                onToggle={async (payload) => { await toggleProductActive.mutateAsync(payload); }}
                disabled={updateProduct.isPending || toggleProductActive.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COMMANDES (Order Management) */}
      {activeTab === "orders" && (
        <div className="card p-6 border border-[#3d2b1f] bg-[#1f1b16] rounded-xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-serif text-[#f4e8d3] italic">Gestion des Commandes</h3>
              <p className="text-sm text-[#a08060]">Gérez vos ventes et expéditions.</p>
            </div>
            <button onClick={() => refetchOrders()} className="text-sm text-[#c9a96e]">Actualiser</button>
          </div>

          {incomingOrders.length === 0 && (
            <p className="text-sm text-[#6b5a48] text-center py-8">Aucune commande reçue pour le moment.</p>
          )}

          <div className="space-y-4">
            {incomingOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              return (
                <div key={order.id} className="p-6 bg-[#241e18] border border-[#3d2b1f] rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[#f4e8d3] font-serif text-lg">Commande #{order.id}</p>
                      <p className="text-xs text-[#8b7355] uppercase">Client: {order.buyer.slice(0, 6)}...{order.buyer.slice(-4)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-sm text-xs uppercase tracking-widest ${statusInfo.bg} ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <p className="text-[#c9a96e] mt-1">{formatEther(BigInt(order.totalPrice))} ETH</p>
                    </div>
                  </div>

                  <div className="border-t border-[#3d2b1f] py-4">
                    {/* Metadata fetching would go here. For now, show ID */}
                    <p className="text-sm text-[#d4c4a8] italic">
                      <a href={resolveMetadataUri(order.metadataURI)} target="_blank" rel="noreferrer" className="hover:text-[#c9a96e] underline">
                        Voir les détails de la commande (JSON)
                      </a>
                    </p>
                    <p className="text-xs text-[#a08060] mt-1">Produit #{order.productId} (x{order.quantity})</p>
                  </div>

                  <div className="flex gap-4 justify-end pt-2">
                    {order.status === "Pending" && (
                      <button
                        onClick={() => handleOrderStatus(order.id, "Approved")}
                        disabled={updateOrderStatus.isPending}
                        className="px-4 py-2 bg-[#c9a96e] text-[#1a1410] text-sm uppercase tracking-wider hover:bg-[#d4b87a] rounded"
                      >
                        Valider la Commande
                      </button>
                    )}
                    {order.status === "Approved" && (
                      <button
                        onClick={() => handleOrderStatus(order.id, "Shipped")}
                        disabled={updateOrderStatus.isPending}
                        className="px-4 py-2 bg-[#7a9a6a] text-[#1a1410] text-sm uppercase tracking-wider hover:bg-[#8ab87a] rounded"
                      >
                        Confirmer l'Expédition
                      </button>
                    )}
                    {order.status === "Shipped" && (
                      <span className="text-xs text-[#7a9a6a] italic">Commande terminée (expédiée)</span>
                    )}
                    {order.status === "Cancelled" && (
                      <span className="text-xs text-red-500 italic">Annulée par le client</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
// End of VendorWorkbench
function SimpleProductCard({
  product,
  onToggle,
  disabled
}: {
  product: Product;
  onUpdate: (payload: { productId: number; metadataURI: string; price: string; quantity: number }) => Promise<unknown>;
  onToggle: (payload: { productId: number; active: boolean }) => Promise<unknown>;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#3d2b1f] bg-[#241e18] overflow-hidden group hover:border-[#8b7355] transition-colors">
      {/* Product Image */}
      {product.metadata?.image && (
        <div className="h-40 overflow-hidden relative">
          <img
            src={product.metadata.image}
            alt={product.metadata.title || "Produit"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
        </div>
      )}

      {/* Product Info */}
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-medium text-[#f4e8d3] truncate font-serif italic">
            {product.metadata?.title || `Produit #${product.id}`}
          </h4>
          <p className="text-xs text-[#8b7355] line-clamp-2 mt-1">
            {product.metadata?.description || "Pas de description"}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-[#c9a96e]">{formatEther(product.price)} ETH</span>
          <span className="text-[#8b7355]">Stock: {product.quantity}</span>
        </div>

        {/* Status & Toggle */}
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full ${product.active
            ? "bg-emerald-900/30 text-emerald-400 border border-emerald-900/50"
            : "bg-red-900/30 text-red-400 border border-red-900/50"
            }`}>
            {product.active ? "Actif" : "Inactif"}
          </span>
          <button
            onClick={() => onToggle({ productId: product.id, active: !product.active })}
            disabled={disabled}
            className="text-xs text-[#a08060] hover:text-[#f4e8d3] transition-colors disabled:opacity-50"
          >
            {product.active ? "Désactiver" : "Activer"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MetadataPreviewProps {
  preview: {
    status: "idle" | "loading" | "ready" | "error";
    data?: ProductMetadata;
    error?: string;
  };
  currentURI: string;
}

function MetadataPreview({ preview, currentURI }: MetadataPreviewProps) {
  return (
    <div className="space-y-3 rounded-xl border border-[#3d2b1f] bg-[#2e261e]/90 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[#a08060]">
        <span>Preview metadata</span>
        <span className="text-[#8b7355]">{preview.status.toUpperCase()}</span>
      </div>
      {!currentURI && <p className="text-sm text-[#a08060]">Saisis une URI (IPFS/HTTPS) pour générer l’aperçu.</p>}
      {currentURI && preview.status === "loading" && <p className="text-sm text-[#a08060]">Chargement…</p>}
      {preview.status === "error" && (
        <p className="text-sm text-[#c97a7a]">
          {preview.error ?? "Impossible de lire cette URI."} (l’URI restera utilisable malgré tout)
        </p>
      )}
      {preview.status === "ready" && preview.data && (
        <div className="space-y-2">
          {preview.data.image && (
            <img
              src={preview.data.image}
              alt={preview.data.title ?? preview.data.description ?? "Image produit"}
              className="max-h-48 w-full rounded-xl border border-[#3d2b1f] object-cover"
            />
          )}
          {preview.data.title && <p className="text-base font-semibold text-[#f4e8d3]">{preview.data.title}</p>}
          {preview.data.description && <p className="text-sm text-[#d4c4a8]">{preview.data.description}</p>}
          <p className="break-all text-xs text-[#8b7355]">
            {preview.data.resolvedURI ?? resolveMetadataUri(currentURI)}
          </p>
        </div>
      )}
    </div>
  );
}

interface MetadataBuilderProps {
  draft: {
    name: string;
    description: string;
    imageFile: File | null;
  };
  onChange: (draft: MetadataBuilderProps["draft"]) => void;
  status: UploadStatus;
  error: string | null;
  onClear: () => void;
}

function MetadataBuilder({ draft, onChange, status, error, onClear }: MetadataBuilderProps) {
  const handleTextChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    onChange({ ...draft, [name]: value });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onChange({ ...draft, imageFile: file });
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#3d2b1f] bg-[#2e261e]/80 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[#a08060]">
        <span>Composer metadata JSON</span>
        <span className="text-[#8b7355]">{status.toUpperCase()}</span>
      </div>
      <p className="text-xs text-[#a08060]">
        Utilise ce formulaire si tu n’as pas déjà un lien IPFS/HTTPS. Le backend générera automatiquement l’URI.
      </p>
      <label className="block space-y-2">
        <span className="text-sm text-[#a08060]">Titre</span>
        <input
          type="text"
          name="name"
          value={draft.name}
          onChange={handleTextChange}
          placeholder="Nom court du produit"
          className="w-full rounded-xl border border-[#5c4033] px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-[#a08060]">Description</span>
        <textarea
          name="description"
          value={draft.description}
          onChange={handleTextChange}
          placeholder="Détails, specs, etc."
          rows={3}
          className="w-full rounded-xl border border-[#5c4033] px-3 py-2 text-sm outline-none focus:border-slate-900 resize-none"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-[#a08060]">Image</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full rounded-xl border border-dashed border-[#5c4033] px-3 py-2 text-sm text-[#a08060]"
        />
      </label>
      {draft.imageFile && (
        <p className="text-xs text-[#a08060]">
          Image sélectionnée : <span className="font-mono">{draft.imageFile.name}</span>
        </p>
      )}
      {error && <p className="text-xs text-[#c97a7a]">{error}</p>}
      <div className="flex items-center gap-3 text-xs text-[#a08060]">
        <button
          type="button"
          className="underline disabled:text-slate-300"
          onClick={onClear}
          disabled={!draft.name && !draft.description && !draft.imageFile}
        >
          Vider le formulaire
        </button>
        {draft.imageFile && <span>Formats supportés : PNG/JPEG (5MB max)</span>}
      </div>
    </div>
  );
}

interface EditableProductCardProps {
  product: Product;
  disabled?: boolean;
  onUpdate: (payload: { productId: number; metadataURI: string; price: string; quantity: number }) => Promise<unknown>;
  onToggle: (payload: { productId: number; active: boolean }) => Promise<unknown>;
}

function EditableProductCard({ product, disabled, onUpdate, onToggle }: EditableProductCardProps) {
  const [local, setLocal] = useState({
    metadataURI: product.metadataURI,
    price: formatUnits(product.price, 18),
    quantity: product.quantity,
  });
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    try {
      await onUpdate({
        productId: product.id,
        metadataURI: local.metadataURI.trim(),
        price: parseEther(local.price || "0").toString(),
        quantity: Number(local.quantity),
      });
      setFeedback("Produit mis à jour.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Échec de la mise à jour";
      setFeedback(message);
    }
  };

  const handleToggle = async () => {
    setFeedback(null);
    try {
      await onToggle({ productId: product.id, active: !product.active });
      setFeedback(product.active ? "Produit désactivé." : "Produit activé.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Échec du toggle";
      setFeedback(message);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#3d2b1f] bg-[#2e261e] p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[#a08060]">
        <span># {product.id}</span>
        <button className="text-[#8b7355] hover:text-[#f4e8d3]" onClick={() => setExpanded((prev) => !prev)}>
          {expanded ? "Fermer" : "Modifier"}
        </button>
      </div>
      <div>
        <p className="break-all text-sm text-[#f4e8d3]">{product.metadataURI}</p>
        {product.metadata?.title && <p className="text-xs text-[#a08060]">{product.metadata.title}</p>}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[#c9a96e]">{formatEther(product.price)} ETH</span>
        <span className="text-[#a08060]">Stock : {product.quantity}</span>
      </div>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${product.active ? "bg-emerald-900/30 text-emerald-400" : "bg-rose-900/30 text-rose-400"
          }`}
      >
        {product.active ? "Actif" : "Inactif"}
      </span>
      {expanded && (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-xs uppercase tracking-wide text-[#a08060]">
            Metadata URI
            <input
              type="url"
              value={local.metadataURI}
              onChange={(event) => setLocal((prev) => ({ ...prev, metadataURI: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-[#5c4033] px-3 py-2 text-sm outline-none focus:border-slate-900 bg-[#241e18] text-[#f4e8d3]"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs uppercase tracking-wide text-[#a08060]">
              Prix (ETH)
              <input
                type="number"
                min="0"
                step="0.0001"
                value={local.price}
                onChange={(event) => setLocal((prev) => ({ ...prev, price: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#5c4033] px-3 py-2 text-sm outline-none focus:border-slate-900 bg-[#241e18] text-[#f4e8d3]"
                required
              />
            </label>
            <label className="block text-xs uppercase tracking-wide text-[#a08060]">
              Quantité
              <input
                type="number"
                min="1"
                value={local.quantity}
                onChange={(event) => setLocal((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
                className="mt-1 w-full rounded-xl border border-[#5c4033] px-3 py-2 text-sm outline-none focus:border-slate-900 bg-[#241e18] text-[#f4e8d3]"
                required
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1 bg-[#c9a96e] text-[#1a1410] rounded-lg" type="submit" disabled={disabled}>
              {disabled ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#5c4033] px-4 py-2 text-sm text-[#d4c4a8] hover:border-[#8b7355] transition-colors"
              onClick={handleToggle}
              disabled={disabled}
            >
              {product.active ? "Désactiver" : "Activer"}
            </button>
          </div>
          {feedback && <p className="text-xs text-[#a08060]">{feedback}</p>}
        </form>
      )}
    </div>
  );
}

function ApplicationSummary({ application, extras }: { application: VendorApplication; extras: Array<[string, string]> }) {
  return (
    <div className="space-y-3 rounded-xl border border-[#3d2b1f] bg-[#2e261e] p-5">
      {application.metadata?.image && (
        <img
          src={application.metadata.image}
          alt={application.metadata.title ?? "Visuel candidature"}
          className="max-h-48 w-full rounded-xl object-cover"
        />
      )}
      <div className="space-y-1">
        {application.metadata?.title && <p className="text-lg font-semibold text-[#f4e8d3]">{application.metadata.title}</p>}
        {application.metadata?.description && <p className="text-sm text-[#d4c4a8]">{application.metadata.description}</p>}
      </div>
      {extras.length > 0 && (
        <dl className="grid gap-2 text-sm text-[#d4c4a8]">
          {extras.map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <dt className="w-32 shrink-0 font-semibold text-[#a08060]">{formatExtraKey(key)}</dt>
              <dd className="flex-1">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <a
        href={resolveMetadataUri(application.metadataURI)}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-[#c9a96e] underline hover:text-[#d4b87a]"
      >
        Consulter la metadata
      </a>
    </div>
  );
}

function formatExtraKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .replace(/_/g, " ")
    .trim();
}
