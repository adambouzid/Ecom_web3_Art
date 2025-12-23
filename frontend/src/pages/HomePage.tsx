import { useWeb3Store } from "../state/useWeb3Store";
import { useRegisterClient } from "../hooks/useContract";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import ThreeDButton from "../components/ThreeDButton";
import heroBg from "../assets/images/pastoria_hero.png";

const HomePage = () => {
    const { account, status, role, connect, refreshRole } = useWeb3Store();
    const registerClient = useRegisterClient();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const connected = status === "connected" && !!account;
    const navigate = useNavigate();

    // Auto-redirect removed to allow all users to see the homepage

    const handleAction = async (targetRole: "CLIENT" | "VENDOR" | "ADMIN") => {
        if (!connected) {
            await connect();
            return;
        }

        // Navigation logic based on target role
        if (targetRole === "CLIENT") {
            if (role === "UNREGISTERED") {
                try {
                    await registerClient.mutateAsync();
                    await refreshRole();
                    navigate({ to: "/market" });
                } catch (e: any) {
                    setErrorMessage(e.message || "Erreur lors de l'inscription");
                }
            } else {
                navigate({ to: "/market" });
            }
        } else if (targetRole === "VENDOR") {
            navigate({ to: "/vendor" });
        } else if (targetRole === "ADMIN") {
            navigate({ to: "/admin" });
        }
    };

    return (
        <div className="relative w-full min-h-screen overflow-hidden bg-[#1a1410]">
            {/* Hero Background with vintage overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src={heroBg}
                    alt="Pastoria Gallery"
                    className="w-full h-full object-cover opacity-70"
                />
                {/* Warm vintage overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a1410]/70 via-[#1a1410]/40 to-[#1a1410]"></div>
                {/* Subtle vignette */}
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 0%, #1a1410 100%)" }}></div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-24 text-center">

                {/* Artistic Header */}
                <div className="mb-8">
                    <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-[#c9a96e] to-transparent mx-auto mb-6"></div>
                    <span className="text-[#c9a96e] text-sm tracking-[0.4em] uppercase font-light">
                        Œuvres d'Exception
                    </span>
                    <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-[#c9a96e] to-transparent mx-auto mt-6"></div>
                </div>

                {/* Main Title - More Artistic */}
                <h1 className="mb-6">
                    <span className="block text-[#f4e8d3] text-lg font-light tracking-[0.2em] uppercase mb-2">
                        Bienvenue sur
                    </span>
                    <span className="block text-6xl md:text-8xl font-serif italic text-[#f4e8d3] tracking-wide">
                        Pastoria
                    </span>
                </h1>

                {/* Elegant Divider */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-[1px] bg-[#8b7355]"></div>
                    <div className="w-2 h-2 rotate-45 border border-[#8b7355]"></div>
                    <div className="w-16 h-[1px] bg-[#8b7355]"></div>
                </div>

                {/* Subtitle - More poetic */}
                <p className="max-w-xl text-[#d4c4a8] text-lg font-light leading-relaxed mb-14 font-serif italic">
                    « Là où l'histoire rencontre l'éternité — <br />
                    des trésors authentifiés, des héritages préservés. »
                </p>

                {/* 3D Buttons Section - Dynamic based on Role */}
                <div className="flex flex-col sm:flex-row gap-10 sm:gap-16 mb-14">
                    {/* Unregistered / Public View */}
                    {(role === "UNREGISTERED" || !connected) && (
                        <>
                            <div className="flex flex-col items-center gap-5">
                                <ThreeDButton onClick={() => handleAction("VENDOR")} variant="primary">
                                    Espace Artisan
                                </ThreeDButton>
                                <span className="text-[#a08060] text-sm font-light tracking-wide">
                                    Partagez vos créations
                                </span>
                            </div>

                            <div className="flex flex-col items-center gap-5">
                                <ThreeDButton onClick={() => handleAction("CLIENT")} variant="secondary">
                                    Espace Amateur
                                </ThreeDButton>
                                <span className="text-[#a08060] text-sm font-light tracking-wide">
                                    Explorez & Collectionnez
                                </span>
                            </div>
                        </>
                    )}

                    {/* Client View */}
                    {role === "CLIENT" && (
                        <div className="flex flex-col items-center gap-5">
                            <ThreeDButton onClick={() => handleAction("CLIENT")} variant="secondary">
                                Explorer les Galeries
                            </ThreeDButton>
                            <span className="text-[#a08060] text-sm font-light tracking-wide">
                                Découvrez nos artisans
                            </span>
                        </div>
                    )}

                    {/* Vendor View */}
                    {role === "VENDOR" && (
                        <div className="flex flex-col items-center gap-5">
                            <ThreeDButton onClick={() => handleAction("VENDOR")} variant="primary">
                                Mon Atelier
                            </ThreeDButton>
                            <span className="text-[#a08060] text-sm font-light tracking-wide">
                                Gérer vos œuvres et ventes
                            </span>
                        </div>
                    )}

                    {/* Admin View */}
                    {role === "ADMIN" && (
                        <div className="flex flex-col items-center gap-5">
                            <ThreeDButton onClick={() => handleAction("ADMIN")} variant="primary">
                                Console Admin
                            </ThreeDButton>
                            <span className="text-[#a08060] text-sm font-light tracking-wide">
                                Gestion de la plateforme
                            </span>
                        </div>
                    )}
                </div>

                {/* Error message */}
                {errorMessage && (
                    <p className="text-[#c97a7a] bg-[#3d1f1f]/60 border border-[#8b4545] px-5 py-3 rounded text-sm mb-6 font-light">
                        {errorMessage}
                    </p>
                )}

                {/* Connection Status */}
                <div className="text-[#8b7355] text-sm font-light">
                    {connected ? (
                        <span className="flex items-center gap-3 justify-center">
                            <span className="w-2 h-2 rounded-full bg-[#7a9a6a]"></span>
                            <span className="font-mono text-xs">{account?.slice(0, 6)}...{account?.slice(-4)}</span>
                        </span>
                    ) : (
                        <span className="italic">Connectez votre portefeuille pour débuter</span>
                    )}
                </div>

                {/* Bottom Decorations */}
                <div className="absolute bottom-10 left-0 right-0 flex justify-between px-10 text-[#5c4a3a] text-xs tracking-[0.2em] uppercase">
                    <span className="hidden md:block">Authenticité</span>
                    <div className="flex items-center gap-3 mx-auto md:mx-0">
                        <div className="w-8 h-[1px] bg-[#5c4a3a]"></div>
                        <span>Est. 2025</span>
                        <div className="w-8 h-[1px] bg-[#5c4a3a]"></div>
                    </div>
                    <span className="hidden md:block">Blockchain</span>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
