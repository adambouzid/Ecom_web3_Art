import pastoriaLogo from "../assets/images/pastoria_logo.png";

interface PastoriaLogoProps {
    size?: "sm" | "md" | "lg";
    showText?: boolean;
    className?: string;
}

const sizes = {
    sm: { icon: "w-8 h-8", text: "text-lg" },
    md: { icon: "w-10 h-10", text: "text-xl" },
    lg: { icon: "w-14 h-14", text: "text-2xl" },
};

export default function PastoriaLogo({
    size = "md",
    showText = true,
    className = ""
}: PastoriaLogoProps) {
    const s = sizes[size];

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className={`${s.icon} rounded-lg overflow-hidden flex-shrink-0`}>
                <img
                    src={pastoriaLogo}
                    alt="Pastoria"
                    className="w-full h-full object-contain"
                />
            </div>
            {showText && (
                <span className={`${s.text} font-serif italic tracking-wide text-[#f4e8d3]`}>
                    Pastoria
                </span>
            )}
        </div>
    );
}
