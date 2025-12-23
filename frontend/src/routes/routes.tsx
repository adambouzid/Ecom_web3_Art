import { createRoute, createRouter, redirect, useNavigate } from "@tanstack/react-router";
import { formatEther } from "ethers";
import { rootRoute } from "./root";
import { useWeb3Store } from "../state/useWeb3Store";
import { useEffect, useMemo, useState } from "react";
import { VendorPage } from "../pages/VendorPage";
import { AdminPage } from "../pages/AdminPage";
import { MarketplacePage } from "../pages/MarketplacePage";
import { AcquisitionsPage } from "../pages/AcquisitionsPage";
import { useRegisterClient } from "../hooks/useContract";
import { useVendorStake } from "../hooks/useVendorApplications";
import type { UserRole } from "../state/useWeb3Store";

const roleDestinations: Record<UserRole, string> = {
  ADMIN: "/admin",
  VENDOR: "/vendor",
  CLIENT: "/market",
  UNREGISTERED: "/",
};

const enforceRole = (allowed: UserRole[]) => {
  return () => {
    const role = useWeb3Store.getState().role;
    if (!allowed.includes(role)) {
      throw redirect({ to: roleDestinations[role] });
    }
  };
};

import HomePage from "../pages/HomePage";

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="bg-[#2a2118] border border-[#4a3828] rounded-lg p-8 space-y-3 shadow-xl">
    <h1 className="text-2xl font-serif text-[#f4e8d3]">{title}</h1>
    <p className="text-[#a08060]">
      This section will host the full experience once we wire contract interactions and final design. For now, it
      serves as a navigation placeholder.
    </p>
  </div>
);

const hubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const marketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/market",
  // Vendors, Clients and Admins can all access the marketplace
  beforeLoad: enforceRole(["CLIENT", "VENDOR", "ADMIN"]),
  component: MarketplacePage,
});

const vendorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vendor",
  // Only Vendors and Admins can access vendor page
  beforeLoad: enforceRole(["VENDOR", "ADMIN", "CLIENT", "UNREGISTERED"]),
  component: VendorPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: enforceRole(["ADMIN"]),
  component: AdminPage,
});

const acquisitionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/acquisitions",
  beforeLoad: enforceRole(["CLIENT"]),
  component: AcquisitionsPage,
});

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orders",
  component: () => <PlaceholderPage title="Orders & Tracking" />,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: () => <PlaceholderPage title="Profile & Settings" />,
});

const routeTree = rootRoute.addChildren([
  hubRoute,
  marketRoute,
  vendorRoute,
  adminRoute,
  acquisitionsRoute,
  ordersRoute,
  profileRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
