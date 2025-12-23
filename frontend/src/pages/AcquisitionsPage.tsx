import { useMemo, useState } from "react";
import { formatEther } from "ethers";
import { useWeb3Store } from "../state/useWeb3Store";
import { useCancelOrder } from "../hooks/useContract";
import { Order, OrderStatus, useOrders } from "../hooks/useOrders";
import { Link } from "@tanstack/react-router";

export function AcquisitionsPage() {
    const { account } = useWeb3Store();
    const { data: orders, refetch: refetchOrders } = useOrders();
    const cancelOrder = useCancelOrder();

    const myOrders = useMemo(() => {
        if (!orders || !account) return [];
        return orders.filter((order) => order.buyer.toLowerCase() === account.toLowerCase());
    }, [orders, account]);

    return (
        <div className="space-y-12 pb-12 px-6 max-w-7xl mx-auto pt-8">

            {/* Header */}
            <div className="text-center space-y-4 mb-12">
                <p className="text-xs uppercase tracking-[0.35em] text-[#c9a96e]">
                    Collection Personnelle
                </p>
                <h1 className="text-4xl md:text-5xl font-serif italic text-[#f4e8d3]">
                    Mes Acquisitions
                </h1>
                <p className="max-w-2xl mx-auto text-[#a08060] font-light italic">
                    « Retrouvez ici l'historique de vos commandes et le statut de vos chefs-d'œuvre. »
                </p>
            </div>

            {myOrders.length === 0 ? (
                <div className="text-center py-20 border border-[#3d2b1f] bg-[#1a1410] rounded-lg">
                    <h3 className="text-xl font-serif text-[#f4e8d3] mb-4 italic">Votre collection est vide</h3>
                    <p className="text-[#8b7355] font-light mb-6">Vous n'avez pas encore acquis d'œuvres.</p>
                    <Link to="/market" className="inline-block px-8 py-3 bg-[#c9a96e] text-[#1a1410] font-serif italic hover:bg-[#d4b87a] transition-colors">
                        Découvrir la Galerie
                    </Link>
                </div>
            ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                    {myOrders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onCancel={async (id) => {
                                try {
                                    await cancelOrder.mutateAsync(id);
                                    refetchOrders();
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            isCancelling={cancelOrder.isPending}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function OrderCard({ order, onCancel, isCancelling }: { order: Order; onCancel: (id: number) => Promise<void>; isCancelling: boolean }) {
    const getStatusInfo = (status: OrderStatus) => {
        switch (status) {
            case "Pending": return { label: "En attente de validation", color: "text-yellow-400", bg: "bg-yellow-900/30", step: 1 };
            case "Approved": return { label: "Validée par l'artisan", color: "text-blue-400", bg: "bg-blue-900/30", step: 2 };
            case "Shipped": return { label: "Expédiée", color: "text-green-400", bg: "bg-green-900/30", step: 3 };
            case "Cancelled": return { label: "Annulée", color: "text-red-400", bg: "bg-red-900/30", step: 0 };
        }
    };

    const info = getStatusInfo(order.status);
    const steps = ["Commande", "Validation", "Expédition"];

    return (
        <div className="p-6 bg-[#1a1410] border border-[#3d2b1f] space-y-4 hover:border-[#5c4033] transition-colors relative overflow-hidden group">
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

            {/* Footer / Actions */}
            <div className="pt-4 border-t border-[#3d2b1f]/50 flex justify-end gap-4 items-center min-h-[40px]">
                {/* Order Complete / Received Badge */}
                {order.status === "Shipped" && (
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-900/20 px-4 py-2 rounded border border-emerald-900/50 animate-pulse">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        <span className="text-sm font-medium tracking-wide">Acquisition Terminée</span>
                    </div>
                )}

                {/* Cancel Action */}
                {order.status === "Pending" && (
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-[#6b5a48] italic group-hover:block hidden transition-all">Vous pouvez annuler tant que la commande n'est pas validée.</span>
                        <button
                            onClick={() => onCancel(order.id)}
                            disabled={isCancelling}
                            className="text-xs text-[#c97a7a] border border-[#c97a7a]/30 px-3 py-1.5 hover:bg-[#c97a7a]/10 transition-colors uppercase tracking-widest"
                        >
                            {isCancelling ? "..." : "Annuler la commande"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
