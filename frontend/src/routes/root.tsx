import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useWeb3Store } from "../state/useWeb3Store";
import type { UserRole } from "../state/useWeb3Store";
import { useVendorApplication } from "../hooks/useVendorApplications";
import { useEnsName } from "../hooks/useEnsName";
import PastoriaLogo from "../components/PastoriaLogo";

export const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-serif italic text-[#f4e8d3] mb-4">Page Introuvable</h1>
      <p className="text-[#a08060] mb-6 font-light">
        Cette page n'existe pas dans notre collection.
      </p>
      <Link to="/" className="inline-block px-6 py-2 bg-[#3d2b1f] text-[#f4e8d3] rounded border border-[#5c4033] hover:bg-[#4a3728] transition-colors font-light tracking-wide">
        Retour à l'Accueil
      </Link>
    </div>
  ),
});

const navByRole: Record<UserRole, { label: string; href: string }[]> = {
  UNREGISTERED: [
    { label: "Accueil", href: "/" },
    { label: "Galerie", href: "/market" },
  ],
  CLIENT: [
    { label: "Accueil", href: "/" },
    { label: "Galerie", href: "/market" },
    // Order history view for clients
    { label: "Mes Acquisitions", href: "/acquisitions" },
  ],
  VENDOR: [
    { label: "Accueil", href: "/" },
    { label: "Mon Atelier", href: "/vendor" },
  ],
  ADMIN: [
    { label: "Accueil", href: "/" },
    { label: "Console Admin", href: "/admin" },
    { label: "Galerie", href: "/market" },
  ],
};

function RootLayout() {
  const { account, status, role, connect, error } = useWeb3Store();

  // Try to fetch vendor metadata to show Brand Name
  const { data: vendorApp } = useVendorApplication(account ?? undefined);
  // Try to fetch ENS name
  const { data: ensName } = useEnsName(account);

  const friendlyStatus = useMemo(() => {
    if (status !== "connected") return status === "connecting" ? "Connexion…" : "Connecter";
    if (!account) return "Connecté";

    if (role === "ADMIN") return "Administrateur";

    // If Vendor and has a brand name, show it
    if (role === "VENDOR") {
      return vendorApp?.metadata?.title || ensName || "Artisan";
    }

    // If Client, show ENS or formatted address
    if (ensName) return ensName;

    return `Client ${account.slice(0, 4)}...${account.slice(-2)}`;
  }, [status, account, role, vendorApp, ensName]);

  const links = useMemo(() => navByRole[role], [role]);

  return (
    <div className="min-h-screen bg-[#1a1410] text-[#f4e8d3] font-sans">
      {/* Elegant Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1410]/95 backdrop-blur-sm border-b border-[#3d2b1f]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
          {/* Logo */}
          <Link to="/" className="group hover:opacity-90 transition-opacity">
            <PastoriaLogo size="md" showText={true} />
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-10 text-sm font-light tracking-wide">
            {links.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="text-[#a08060] hover:text-[#f4e8d3] transition-colors"
              // Add hash scrolling logic could be here if needed for single-page sections
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Wallet Button */}
          <div className="flex items-center gap-4">
            <button
              className="px-5 py-2 rounded border border-[#5c4033] bg-[#3d2b1f] text-[#f4e8d3] text-sm font-light tracking-wide hover:bg-[#4a3728] hover:border-[#8b7355] transition-all"
              onClick={() => connect()}
              disabled={status === "connecting"}
            >
              {friendlyStatus}
            </button>
            {status === "connected" && (
              <span className="hidden sm:block text-xs text-[#8b7355] uppercase tracking-wider font-light">
                {role}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Error Banner */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-[#3d1f1f]/90 border border-[#8b4545] text-[#e8c8c8] text-sm px-6 py-3 rounded backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Main Content */}
      <main className="pt-20 min-h-screen">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#12100d] border-t border-[#2a2218] py-8 text-center">
        <p className="text-[#5c4a3a] text-sm font-light tracking-wide">
          © 2025 Pastoria — L'Art Authentifié
        </p>
      </footer>
    </div>
  );
}
