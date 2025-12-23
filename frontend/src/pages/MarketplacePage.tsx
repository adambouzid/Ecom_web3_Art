import { FormEvent, useMemo, useState } from "react";
import { formatEther } from "ethers";
import { useProducts } from "../hooks/useProducts";
import { useWeb3Store } from "../state/useWeb3Store";
import { useCancelOrder, useCreateOrder, useUpdateOrderStatus } from "../hooks/useContract";
import { Order, OrderStatus, useOrders } from "../hooks/useOrders";
import { createMetadataUri } from "../lib/metadataClient";
import { useVendorApplications } from "../hooks/useVendorApplications";

export function MarketplacePage() {
  const { role, status, connect, account } = useWeb3Store();
  const { data: products, isLoading, refetch, isError, error } = useProducts();
  const { data: vendorApplications } = useVendorApplications();
  const { data: orders, refetch: refetchOrders } = useOrders();
  const createOrder = useCreateOrder();
  const updateOrderStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();

  const [viewMode, setViewMode] = useState<"vendors" | "gallery">("vendors");
  const [selectedVendorAddress, setSelectedVendorAddress] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNotes, setOrderNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);

  // Filter vendors to only show approved ones
  const approvedVendors = useMemo(() => {
    return vendorApplications?.filter(app => app.status === "APPROVED") || [];
  }, [vendorApplications]);

  // Filter products based on search and selected vendor
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter((product) => product.active && product.quantity > 0)
      .filter((product) => {
        // If a specific vendor is selected, strictly filter by their address
        if (selectedVendorAddress && product.vendor.toLowerCase() !== selectedVendorAddress.toLowerCase()) {
          return false;
        }
        return true;
      })
      .filter((product) => {
        if (search.length === 0) return true;
        const searchLower = search.toLowerCase();
        return (
          product.metadata?.title?.toLowerCase().includes(searchLower) ||
          product.metadata?.description?.toLowerCase().includes(searchLower)
        );
      });
  }, [products, search, selectedVendorAddress]);

  const selectedProductData = useMemo(() => {
    if (selectedProduct === null) return null;
    return filteredProducts.find((p) => p.id === selectedProduct) || null;
  }, [filteredProducts, selectedProduct]);

  // Handle viewing a specific vendor's gallery
  const handleViewVendorGallery = (vendorAddress: string) => {
    setSelectedVendorAddress(vendorAddress);
    setViewMode("gallery");
    setSearch(""); // Reset search when entering a gallery
  };

  const handleBackToVendors = () => {
    setSelectedVendorAddress(null);
    setViewMode("vendors");
  };

  const handleOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProductData || role !== "CLIENT") return;

    setIsOrdering(true);
    setMessage(null);

    try {
      // Auto-generate order metadata (no user input needed)
      const metadataURI = await createMetadataUri({
        name: `Commande - ${selectedProductData.metadata?.title || `Produit #${selectedProductData.id}`}`,
        description: orderNotes || `Commande de ${orderQuantity} unité(s)`,
      });

      await createOrder.mutateAsync({
        productId: selectedProductData.id,
        quantity: orderQuantity,
        metadataURI,
        price: selectedProductData.price.toString(),
      });

      setMessage("✓ Commande passée avec succès!");
      setSelectedProduct(null);
      setOrderQuantity(1);
      setOrderNotes("");
      refetch();
      refetchOrders();
    } catch (err) {
      const e = err as Error;
      const msg = e.message.toLowerCase();
      if (msg.includes("rejected") || msg.includes("denied") || msg.includes("4001")) {
        setMessage(null); // Toast handles it, clear local error
      } else {
        setMessage(`✗ ${e.message}`);
      }
    } finally {
      setIsOrdering(false);
    }
  };

  const myOrders = useMemo(() => {
    if (!orders || !account) return [];
    return orders.filter((order) => order.buyer === account);
  }, [orders, account]);

  const incomingOrders = useMemo(() => {
    if (!orders || !account) return [];
    return orders.filter((order) => order.vendor === account);
  }, [orders, account]);

  // Get current vendor details for header
  const currentVendorDetails = useMemo(() => {
    if (!selectedVendorAddress) return null;
    return approvedVendors.find(v => v.applicant.toLowerCase() === selectedVendorAddress.toLowerCase());
  }, [approvedVendors, selectedVendorAddress]);

  return (
    <div className="space-y-12 pb-12 px-6 max-w-7xl mx-auto">

      {/* View Switcher / Breadcrumbs (Only if not Admin/Vendor locked to their view) */}
      {viewMode === "gallery" && selectedVendorAddress && (
        <div className="flex items-center gap-2 text-sm text-[#a08060]">
          <button onClick={handleBackToVendors} className="hover:text-[#f4e8d3] transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            Liste des Artisans
          </button>
          <span>/</span>
          <span className="text-[#f4e8d3] font-serif italic">
            {currentVendorDetails?.metadata?.title || "Galerie Artisan"}
          </span>
        </div>
      )}

      {/* Header Section */}
      <div className="text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-[#c9a96e]">
          {viewMode === "vendors" ? "Nos Créateurs" : "Collection Exclusive"}
        </p>
        <h1 className="text-4xl md:text-5xl font-serif italic text-[#f4e8d3]">
          {viewMode === "vendors" ? "Les Artisans d'Art" : (currentVendorDetails?.metadata?.title || "Tous les Chefs-d'œuvre")}
        </h1>
        {viewMode === "gallery" && currentVendorDetails?.metadata?.description && (
          <p className="max-w-2xl mx-auto text-[#a08060] font-light italic">
            « {currentVendorDetails.metadata.description} »
          </p>
        )}
      </div>


      {/* VENDORS LIST VIEW */}
      {viewMode === "vendors" && (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {approvedVendors.map((vendor) => (
            <div key={vendor.applicant} className="group relative bg-[#241e18] border border-[#3d2b1f] hover:border-[#8b7355] transition-all duration-500 overflow-hidden cursor-pointer"
              onClick={() => handleViewVendorGallery(vendor.applicant)}>

              <div className="h-64 overflow-hidden relative bg-[#1a1410]">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all duration-500 z-10"></div>
                {vendor.metadata?.image ? (
                  <img
                    src={vendor.metadata.image}
                    alt={vendor.metadata.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 filter sepia-[.2]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}

                {/* Fallback if no image or error */}
                <div className={`w-full h-full flex items-center justify-center ${vendor.metadata?.image ? 'hidden' : ''}`}>
                  <div className="text-center">
                    <span className="text-[#3d2b1f] text-9xl font-serif italicOpacity-10 block select-none">P</span>
                  </div>
                </div>
              </div>

              {/* Vendor Info Card */}
              <div className="p-6 text-center space-y-3 relative z-20 -mt-10 mx-4 bg-[#241e18] border-t border-[#3d2b1f] shadow-2xl">
                <h3 className="text-xl font-serif text-[#f4e8d3]">{vendor.metadata?.title || "Artisan Inconnu"}</h3>
                <p className="text-xs text-[#8b7355] uppercase tracking-widest line-clamp-1">
                  {vendor.metadata?.description || "Créations uniques"}
                </p>
                <button className="text-sm text-[#c9a96e] hover:text-[#f4e8d3] transition-colors pt-2 border-b border-transparent hover:border-[#c9a96e] pb-0.5">
                  Visiter la Galerie
                </button>
              </div>
            </div>
          ))}

          {approvedVendors.length === 0 && (
            <div className="col-span-full text-center py-20 bg-[#1a1410] border border-[#3d2b1f] rounded-lg">
              <p className="text-[#8b7355] font-light">Aucun artisan n'est encore enregistré.</p>
            </div>
          )}
        </div>
      )}


      {/* GALLERY / PRODUCTS VIEW */}
      {viewMode === "gallery" && (
        <>
          {/* Search Bar */}
          <div className="flex justify-center mb-10">
            <div className="relative w-full max-w-md">
              <input
                type="search"
                placeholder="Rechercher une œuvre..."
                className="w-full bg-transparent border-b border-[#5c4033] px-4 py-2 text-[#f4e8d3] placeholder-[#6b5a48] focus:border-[#c9a96e] focus:outline-none transition-colors text-center font-serif italic"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Premium Product Grid */}
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group flex flex-col items-center text-center space-y-4"
              >
                {/* Frame Container */}
                <div className="relative w-full aspect-[4/5] p-3 bg-[#2a2118] shadow-2xl overflow-hidden cursor-pointer"
                  style={{ boxShadow: "0 20px 50px -12px rgba(0, 0, 0, 0.5)" }}
                  onClick={() => {
                    setSelectedProduct(product.id);
                    setOrderQuantity(1);
                    setOrderNotes("");
                    setMessage(null);
                  }}>

                  <div className="w-full h-full overflow-hidden relative border border-[#3d2b1f]/50">
                    {product.metadata?.image ? (
                      <img
                        src={product.metadata.image}
                        alt={product.metadata.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1a1410] flex items-center justify-center text-[#3d2b1f]">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}

                    {/* Sold Out Overlay */}
                    {product.quantity === 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                        <span className="text-[#c9a96e] border border-[#c9a96e] px-4 py-2 uppercase tracking-widest text-xs font-light">Épuisé</span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 pointer-events-none">
                      <span className="text-[#f4e8d3] font-serif italic tracking-wide border-b border-[#f4e8d3] pb-1">Voir les détails</span>
                    </div>
                  </div>
                </div>

                {/* Minimalist Info */}
                <div className="space-y-1">
                  <h3 className="text-xl font-serif text-[#f4e8d3] italic">
                    {product.metadata?.title || `Œuvre #${product.id}`}
                  </h3>
                  <p className="text-[#c9a96e] font-light tracking-wide text-sm">
                    {formatEther(product.price)} ETH
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && !isLoading && (
            <div className="text-center py-20">
              <p className="text-[#6b5a48] font-serif italic text-lg">Cette collection est actuellement vide.</p>
            </div>
          )}
        </>
      )}

      {/* Order Modal (Unchanged logic, just styled) */}
      {selectedProduct !== null && selectedProductData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1410] border border-[#3d2b1f] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl">

            {/* Image Side */}
            <div className="w-full md:w-1/2 bg-[#000] flex items-center justify-center overflow-hidden h-64 md:h-auto">
              {selectedProductData.metadata?.image && (
                <img src={selectedProductData.metadata.image} className="w-full h-full object-cover opacity-90" />
              )}
            </div>

            {/* Form Side */}
            <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[#c9a96e] text-xs uppercase tracking-[0.2em] mb-2">Acquisition</p>
                  <h2 className="text-3xl font-serif text-[#f4e8d3] italic">{selectedProductData.metadata?.title}</h2>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="text-[#6b5a48] hover:text-[#f4e8d3] transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>

              <p className="text-[#a08060] font-light leading-relaxed text-sm border-l-2 border-[#3d2b1f] pl-4">
                {selectedProductData.metadata?.description}
              </p>

              <div className="bg-[#241e18] p-6 space-y-4 border border-[#3d2b1f]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8b7355]">Prix Unitaire</span>
                  <span className="text-[#f4e8d3]">{formatEther(selectedProductData.price)} ETH</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#8b7355] uppercase tracking-wider">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProductData.quantity}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Math.max(1, Math.min(selectedProductData.quantity, Number(e.target.value))))}
                    className="w-full bg-[#1a1410] border border-[#3d2b1f] px-3 py-2 text-[#f4e8d3] focus:border-[#c9a96e] outline-none"
                  />
                </div>
                <div className="pt-4 border-t border-[#3d2b1f] flex justify-between items-center">
                  <span className="text-[#f4e8d3] font-serif italic text-lg">Total Estimé</span>
                  <span className="text-[#c9a96e] text-xl font-light">{formatEther(BigInt(selectedProductData.price) * BigInt(orderQuantity))} ETH</span>
                </div>
              </div>

              {role === "CLIENT" ? (
                <div className="space-y-3">
                  <button
                    onClick={handleOrder}
                    disabled={isOrdering || createOrder.isPending}
                    className="w-full py-4 bg-[#c9a96e] text-[#1a1410] font-serif italic text-lg hover:bg-[#d4b87a] transition-colors disabled:opacity-50"
                  >
                    {isOrdering ? "Confirmation en cours..." : "Confirmer l'Acquisition"}
                  </button>
                  {message && <p className={`text-center text-sm ${message.includes("✓") ? "text-green-400" : "text-red-400"}`}>{message}</p>}
                </div>
              ) : (
                <p className="text-center text-[#8b7355] text-xs uppercase tracking-widest border border-[#3d2b1f] py-3">
                  Connectez-vous en tant que client pour acquérir cette œuvre
                </p>
              )}
            </div>
          </div>
        </div>
      )}


      {/* My Orders Section moved to /acquisitions */}

      {/* Incoming Orders Section removed (Moved to Vendor Dashboard) */}
    </div>
  );
}

// Order List Component with Tracking
interface OrderListProps {
  title: string;
  emptyText: string;
  orders: Order[];
  onStatusUpdate: ((orderId: number, newStatus: OrderStatus) => Promise<void>) | null;
  onCancel: ((orderId: number) => Promise<void>) | null;
  isUpdating?: boolean;
  isCancelling?: boolean;
}

function OrderList({ title, emptyText, orders, onStatusUpdate, onCancel, isUpdating, isCancelling }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="border-t border-[#3d2b1f] pt-12 text-center">
        <h3 className="text-2xl font-serif text-[#f4e8d3] mb-4 italic">{title}</h3>
        <p className="text-[#a08060] font-light">{emptyText}</p>
      </div>
    );
  }

  // Helper to map status to UI state
  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case "Pending": return { label: "En attente de validation", color: "text-yellow-400", bg: "bg-yellow-900/30", step: 1 };
      case "Approved": return { label: "Validée par l'artisan", color: "text-blue-400", bg: "bg-blue-900/30", step: 2 };
      case "Shipped": return { label: "Expédiée", color: "text-green-400", bg: "bg-green-900/30", step: 3 };
      case "Cancelled": return { label: "Annulée", color: "text-red-400", bg: "bg-red-900/30", step: 0 };
    }
  };

  const steps = ["Commande", "Validation", "Expédition"];

  return (
    <div className="border-t border-[#3d2b1f] pt-12">
      <h3 className="text-2xl font-serif text-[#f4e8d3] mb-8 text-center italic">{title}</h3>
      <div className="space-y-6 max-w-4xl mx-auto">
        {orders.map((order) => {
          const info = getStatusInfo(order.status);

          return (
            <div key={order.id} className="p-6 bg-[#1a1410] border border-[#3d2b1f] space-y-4 hover:border-[#5c4033] transition-colors relative overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[#f4e8d3] font-serif text-lg">Commande #{order.id}</p>
                  <p className="text-xs text-[#8b7355] uppercase tracking-wider">
                    Produit #{order.productId} • {order.quantity} Unité(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#c9a96e] font-light text-lg">{formatEther(BigInt(order.totalPrice))} ETH</p>
                  <span className={`inline-block text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm mt-1 ${info.bg} ${info.color}`}>
                    {info.label}
                  </span>
                </div>
              </div>

              {/* Progress Bar (Only if not cancelled) */}
              {order.status !== "Cancelled" && (
                <div className="relative pt-4 pb-2">
                  <div className="flex justify-between mb-2 text-xs text-[#8b7355] font-light tracking-wide uppercase">
                    {steps.map((step, idx) => (
                      <span key={step} className={idx + 1 <= info.step ? "text-[#c9a96e]" : ""}>{step}</span>
                    ))}
                  </div>
                  <div className="h-1 bg-[#3d2b1f] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#c9a96e] transition-all duration-500"
                      style={{ width: `${(info.step / 3) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-4 border-t border-[#3d2b1f]/50 flex justify-end gap-4 items-center">

                {/* Order Complete / Received */}
                {order.status === "Shipped" && !onStatusUpdate && (
                  <div className="flex items-center gap-2 text-emerald-400 bg-emerald-900/20 px-4 py-2 rounded border border-emerald-900/50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    <span className="text-sm font-medium tracking-wide">Acquisition Terminée</span>
                  </div>
                )}

                {/* Client Cancel Action */}
                {onCancel && order.status === "Pending" && (
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[#6b5a48] italic">Vous pouvez annuler tant que la commande n'est pas validée.</span>
                    <button
                      onClick={() => onCancel(order.id)}
                      disabled={isCancelling}
                      className="text-xs text-[#c97a7a] border border-[#c97a7a]/30 px-3 py-1.5 hover:bg-[#c97a7a]/10 transition-colors uppercase tracking-widest"
                    >
                      {isCancelling ? "..." : "Annuler la commande"}
                    </button>
                  </div>
                )}

                {/* Vendor Actions */}
                {onStatusUpdate && order.status === "Pending" && (
                  <button onClick={() => onStatusUpdate(order.id, "Approved")} disabled={isUpdating} className="text-xs bg-[#c9a96e] text-[#1a1410] px-4 py-2 uppercase tracking-widest hover:bg-[#d4b87a]">
                    Valider la commande
                  </button>
                )}
                {onStatusUpdate && order.status === "Approved" && (
                  <button onClick={() => onStatusUpdate(order.id, "Shipped")} disabled={isUpdating} className="text-xs bg-[#7a9a6a] text-[#1a1410] px-4 py-2 uppercase tracking-widest hover:bg-[#8ab87a]">
                    Marquer comme Expédiée
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
