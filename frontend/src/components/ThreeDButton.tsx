import React from "react";

interface ThreeDButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: "primary" | "secondary";
}

const ThreeDButton: React.FC<ThreeDButtonProps> = ({
    children,
    className = "",
    variant = "primary",
    ...props
}) => {
    // Earthy, wood-like color schemes - matte finish
    const colors = {
        primary: {
            top: "bg-[#f4e8d3]", // Aged parchment
            topText: "text-[#3d2b1f]", // Dark wood brown
            bottom: "bg-[#d4c4a8]", // Light wood
            shadow: "bg-[#5c4033]", // Walnut shadow
            border: "border-[#3d2b1f]",
        },
        secondary: {
            top: "bg-[#e8dcc8]", // Cream
            topText: "text-[#4a3728]", // Espresso
            bottom: "bg-[#c9b896]", // Tan
            shadow: "bg-[#6b4423]", // Mahogany shadow
            border: "border-[#4a3728]",
        },
    };

    const c = colors[variant];

    return (
        <div className={`relative inline-block group ${className}`}>
            <button
                {...props}
                className="relative w-[220px] h-[58px] p-0 border-none outline-none bg-transparent cursor-pointer touch-manipulation"
            >
                {/* Wooden pegs/legs */}
                <div className="absolute bottom-0 left-[12%] w-[4px] h-[12px] bg-[#3d2b1f] z-0 rounded-b-sm"></div>
                <div className="absolute bottom-0 right-[12%] w-[4px] h-[12px] bg-[#3d2b1f] z-0 rounded-b-sm"></div>

                {/* Middle layer - wood grain feel */}
                <div className={`absolute top-[10px] left-0 w-full h-full ${c.bottom} rounded-xl border-2 ${c.border} -z-10`}></div>

                {/* Shadow/depth layer */}
                <div className={`absolute top-[14px] left-[-1px] w-[calc(100%+2px)] h-full ${c.shadow} rounded-xl -z-20`}></div>

                {/* Top clickable surface */}
                <div
                    className={`relative w-full h-full ${c.top} ${c.topText} font-serif font-medium text-lg tracking-wide flex items-center justify-center rounded-xl border-2 ${c.border} transition-transform duration-150 overflow-hidden active:translate-y-[10px] group-active:translate-y-[10px]`}
                >
                    {/* Subtle wood grain texture overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJuIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjciIG51bU9jdGF2ZXM9IjEwIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIuNSIvPjwvc3ZnPg==')]"></div>

                    {children}
                </div>
            </button>
        </div>
    );
};

export default ThreeDButton;
