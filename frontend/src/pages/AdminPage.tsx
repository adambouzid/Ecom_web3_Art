import { FormEvent, useMemo, useState } from "react";
import { getAddress } from "ethers";
import { useWeb3Store } from "../state/useWeb3Store";
import { useGrantAdmin, useGrantVendor, useRegisterClient, useSetVendorStatus } from "../hooks/useContract";
import { useRoleDirectory } from "../hooks/useRoles";
import {
  useApproveVendorApplication,
  useRejectVendorApplication,
  useVendorApplications,
  type VendorApplication,
} from "../hooks/useVendorApplications";

export function AdminPage() {
  const { role } = useWeb3Store();
  const registerClient = useRegisterClient();
  const grantVendor = useGrantVendor();
  const grantAdmin = useGrantAdmin();
  const setVendorStatus = useSetVendorStatus();
  const roleDirectory = useRoleDirectory();
  const vendorApplications = useVendorApplications();
  const approveApplication = useApproveVendorApplication();
  const rejectApplication = useRejectVendorApplication();

  const [activeTab, setActiveTab] = useState<"applications" | "vendors" | "admins">("applications");
  const [vendorAddress, setVendorAddress] = useState("");
  const [statusAddress, setStatusAddress] = useState("");
  const [adminAddress, setAdminAddress] = useState("");
  const [vendorStatusAction, setVendorStatusAction] = useState<"activate" | "deactivate">("activate");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleRegisterClient = async () => {
    try {
      await registerClient.mutateAsync();
      showMessage("Vous êtes maintenant enregistré comme client!", "success");
    } catch (error) {
      showMessage((error as Error).message, "error");
    }
  };

  const validateInputAddress = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.length === 66) {
      throw new Error("Erreur: Vous avez collé une Clé Privée (Private Key) ou un Hash, pas une adresse ! Une adresse Ethereum commence par 0x et fait 42 caractères.");
    }
    if (!trimmed.startsWith("0x") || trimmed.length !== 42) {
      throw new Error("Format invalide. Une adresse doit commencer par 0x et faire 42 caractères.");
    }
    return getAddress(trimmed);
  };

  const handleVendorGrant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const normalized = validateInputAddress(vendorAddress);
      await grantVendor.mutateAsync(normalized);
      showMessage("Rôle vendeur accordé avec succès!", "success");
      setVendorAddress("");
      roleDirectory.refetch();
    } catch (error) {
      showMessage((error as Error).message, "error");
    }
  };

  const handleVendorStatus = async () => {
    if (!statusAddress.trim()) return;
    try {
      const normalized = validateInputAddress(statusAddress);
      await setVendorStatus.mutateAsync({
        address: normalized,
        active: vendorStatusAction === "activate",
      });
      showMessage(`Vendeur ${vendorStatusAction === "activate" ? "activé" : "désactivé"} avec succès!`, "success");
      setStatusAddress("");
      roleDirectory.refetch();
    } catch (error) {
      showMessage((error as Error).message, "error");
    }
  };

  const handleGrantAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminAddress.trim()) return;
    try {
      const normalized = validateInputAddress(adminAddress);
      await grantAdmin.mutateAsync(normalized);
      showMessage("Rôle administrateur accordé!", "success");
      setAdminAddress("");
      roleDirectory.refetch();
    } catch (error) {
      showMessage((error as Error).message, "error");
    }
  };

  const groupedRoles = useMemo(() => {
    const entries = roleDirectory.data ?? [];
    return {
      admins: entries.filter((entry) => entry.role === "ADMIN"),
      vendors: entries.filter((entry) => entry.role === "VENDOR"),
      clients: entries.filter((entry) => entry.role === "CLIENT"),
    };
  }, [roleDirectory.data]);

  const pendingApplications = useMemo(
    () => (vendorApplications.data ?? []).filter((app) => app.status === "PENDING"),
    [vendorApplications.data]
  );

  const reviewedApplications = useMemo(
    () => (vendorApplications.data ?? []).filter((app) => app.status !== "PENDING"),
    [vendorApplications.data]
  );

  const handleApprove = async (applicant: string) => {
    setProcessing(`approve:${applicant}`);
    try {
      await approveApplication.mutateAsync(applicant);
      showMessage("Candidature approuvée!", "success");
      vendorApplications.refetch();
    } catch (error) {
      showMessage((error as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (applicant: string) => {
    setProcessing(`reject:${applicant}`);
    try {
      await rejectApplication.mutateAsync(applicant);
      showMessage("Candidature refusée", "success");
      vendorApplications.refetch();
    } catch (error) {
      showMessage((error as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  };

  // Non-admin view
  if (role !== "ADMIN") {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 rounded-xl border border-[#3d2b1f] bg-[#241e18] text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#3d2b1f] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#c9a96e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-serif text-[#f4e8d3] mb-2">Accès Administrateur</h1>
        <p className="text-[#8b7355] text-sm mb-6">
          Cette section est réservée aux administrateurs de la plateforme.
        </p>
        <button
          onClick={handleRegisterClient}
          disabled={registerClient.isPending}
          className="w-full py-3 rounded-lg bg-[#3d2b1f] text-[#d4c4a8] border border-[#5c4033] hover:bg-[#4a3728] transition-colors disabled:opacity-50"
        >
          {registerClient.isPending ? "Enregistrement..." : "Devenir client à la place"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#c9a96e]">Administration</p>
            <h1 className="mt-2 text-3xl font-serif text-[#f4e8d3]">Console Admin</h1>
          </div>
          <button
            onClick={() => roleDirectory.refetch()}
            className="px-4 py-2 rounded-lg border border-[#5c4033] text-[#a08060] hover:bg-[#2e261e] transition-colors text-sm"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-3xl font-semibold text-[#c9a96e]">{pendingApplications.length}</div>
          <div className="text-sm text-[#8b7355]">En attente</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-semibold text-[#f4e8d3]">{groupedRoles.vendors.length}</div>
          <div className="text-sm text-[#8b7355]">Vendeurs</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-semibold text-[#f4e8d3]">{groupedRoles.clients.length}</div>
          <div className="text-sm text-[#8b7355]">Clients</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-semibold text-[#f4e8d3]">{groupedRoles.admins.length}</div>
          <div className="text-sm text-[#8b7355]">Admins</div>
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-900/20 text-green-400 border border-green-800" : "bg-red-900/20 text-red-400 border border-red-800"}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#3d2b1f]">
        {[
          { id: "applications" as const, label: "Candidatures", count: pendingApplications.length },
          { id: "vendors" as const, label: "Vendeurs", count: groupedRoles.vendors.length },
          { id: "admins" as const, label: "Gestion Admins", count: groupedRoles.admins.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.id
              ? "text-[#c9a96e] border-b-2 border-[#c9a96e]"
              : "text-[#8b7355] hover:text-[#d4c4a8]"
              }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? "bg-[#c9a96e]/20" : "bg-[#3d2b1f]"
                }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          {pendingApplications.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-[#6b5a48]">Aucune candidature en attente</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingApplications.map((app) => (
                <ApplicationCard
                  key={app.applicant}
                  application={app}
                  onApprove={() => handleApprove(app.applicant)}
                  onReject={() => handleReject(app.applicant)}
                  isApproving={processing === `approve:${app.applicant}`}
                  isRejecting={processing === `reject:${app.applicant}`}
                />
              ))}
            </div>
          )}

          {/* Reviewed Applications */}
          {reviewedApplications.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-[#a08060] mb-4">Historique</h3>
              <div className="grid gap-3">
                {reviewedApplications.map((app) => (
                  <div
                    key={app.applicant}
                    className="flex items-center justify-between p-4 rounded-lg bg-[#1a1410] border border-[#3d2b1f]"
                  >
                    <div>
                      <p className="text-[#f4e8d3] font-medium">{app.metadata?.title || "Sans titre"}</p>
                      <p className="text-xs text-[#6b5a48] font-mono">{app.applicant.slice(0, 10)}...{app.applicant.slice(-8)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${app.status === "APPROVED"
                      ? "bg-green-900/30 text-green-400"
                      : "bg-red-900/30 text-red-400"
                      }`}>
                      {app.status === "APPROVED" ? "Approuvé" : "Refusé"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "vendors" && (
        <div className="space-y-6">
          {/* Add Vendor Form */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-[#f4e8d3] mb-4">Ajouter un vendeur</h3>
            <form onSubmit={handleVendorGrant} className="flex gap-3">
              <input
                type="text"
                value={vendorAddress}
                onChange={(e) => setVendorAddress(e.target.value)}
                placeholder="Adresse Ethereum (0x...)"
                className="flex-1 rounded-lg border border-[#5c4033] bg-[#2e261e] px-4 py-3 text-[#f4e8d3] placeholder-[#6b5a48] focus:border-[#c9a96e] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={grantVendor.isPending || !vendorAddress.trim()}
                className="px-6 py-3 rounded-lg bg-[#c9a96e] text-[#1a1410] font-medium hover:bg-[#d4b87a] transition-colors disabled:opacity-50"
              >
                {grantVendor.isPending ? "..." : "Ajouter"}
              </button>
            </form>
          </div>

          {/* Vendor Status Toggle */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-[#f4e8d3] mb-4">Activer / Désactiver un vendeur</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={statusAddress}
                onChange={(e) => setStatusAddress(e.target.value)}
                placeholder="Adresse du vendeur (0x...)"
                className="flex-1 rounded-lg border border-[#5c4033] bg-[#2e261e] px-4 py-3 text-[#f4e8d3] placeholder-[#6b5a48] focus:border-[#c9a96e] focus:outline-none transition-colors"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setVendorStatusAction("activate"); handleVendorStatus(); }}
                  disabled={setVendorStatus.isPending || !statusAddress.trim()}
                  className="px-4 py-3 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors disabled:opacity-50"
                >
                  Activer
                </button>
                <button
                  type="button"
                  onClick={() => { setVendorStatusAction("deactivate"); handleVendorStatus(); }}
                  disabled={setVendorStatus.isPending || !statusAddress.trim()}
                  className="px-4 py-3 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                >
                  Désactiver
                </button>
              </div>
            </div>
          </div>

          {/* Vendors List */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-[#f4e8d3] mb-4">Vendeurs actifs ({groupedRoles.vendors.length})</h3>
            {groupedRoles.vendors.length === 0 ? (
              <p className="text-[#6b5a48]">Aucun vendeur enregistré</p>
            ) : (
              <div className="space-y-2">
                {groupedRoles.vendors.map((v) => (
                  <div key={v.address} className="flex items-center justify-between p-3 rounded-lg bg-[#1a1410] border border-[#3d2b1f]">
                    <span className="font-mono text-sm text-[#d4c4a8]">{v.address}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${v.vendorActive ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                      }`}>
                      {v.vendorActive ? "Actif" : "Inactif"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "admins" && (
        <div className="space-y-6">
          {/* Add Admin Form */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-[#f4e8d3] mb-2">Ajouter un administrateur</h3>
            <p className="text-sm text-[#8b7355] mb-4">⚠️ Action sensible - vérifiez bien l'adresse</p>
            <form onSubmit={handleGrantAdmin} className="flex gap-3">
              <input
                type="text"
                value={adminAddress}
                onChange={(e) => setAdminAddress(e.target.value)}
                placeholder="Adresse Ethereum (0x...)"
                className="flex-1 rounded-lg border border-[#5c4033] bg-[#2e261e] px-4 py-3 text-[#f4e8d3] placeholder-[#6b5a48] focus:border-[#c9a96e] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={grantAdmin.isPending || !adminAddress.trim()}
                className="px-6 py-3 rounded-lg bg-[#c9a96e] text-[#1a1410] font-medium hover:bg-[#d4b87a] transition-colors disabled:opacity-50"
              >
                {grantAdmin.isPending ? "..." : "Ajouter"}
              </button>
            </form>
          </div>

          {/* Admins List */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-[#f4e8d3] mb-4">Administrateurs ({groupedRoles.admins.length})</h3>
            {groupedRoles.admins.length === 0 ? (
              <p className="text-[#6b5a48]">Aucun administrateur</p>
            ) : (
              <div className="space-y-2">
                {groupedRoles.admins.map((a) => (
                  <div key={a.address} className="p-3 rounded-lg bg-[#1a1410] border border-[#3d2b1f]">
                    <span className="font-mono text-sm text-[#d4c4a8]">{a.address}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Application Card Component
function ApplicationCard({
  application,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  application: VendorApplication;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-[#f4e8d3] text-lg">
            {application.metadata?.title || "Sans titre"}
          </h3>
          <p className="text-xs text-[#6b5a48] font-mono mt-1">
            {application.applicant.slice(0, 14)}...{application.applicant.slice(-10)}
          </p>
        </div>
        <span className="px-2 py-1 rounded-full bg-yellow-900/30 text-yellow-400 text-xs">
          En attente
        </span>
      </div>

      {/* Description */}
      {application.metadata?.description && (
        <p className="text-sm text-[#a08060]">{application.metadata.description}</p>
      )}

      {/* Stake Info */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1410]">
        <span className="text-sm text-[#8b7355]">Stake déposé</span>
        <span className="text-[#c9a96e] font-medium">{application.stakeEth} ETH</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onReject}
          disabled={isRejecting || isApproving}
          className="flex-1 py-3 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
        >
          {isRejecting ? "..." : "Refuser"}
        </button>
        <button
          onClick={onApprove}
          disabled={isApproving || isRejecting}
          className="flex-1 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isApproving ? "..." : "Approuver"}
        </button>
      </div>
    </div>
  );
}
