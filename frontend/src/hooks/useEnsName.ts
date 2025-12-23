import { useQuery } from "@tanstack/react-query";
import { getReadOnlyProvider } from "../lib/web3";

export function useEnsName(address?: string | null) {
    return useQuery({
        queryKey: ["ens-name", address],
        queryFn: async () => {
            if (!address) return null;
            try {
                const provider = getReadOnlyProvider();
                const name = await provider.lookupAddress(address);
                return name;
            } catch (error) {
                console.warn("ENS lookup failed", error);
                return null;
            }
        },
        enabled: !!address,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}
