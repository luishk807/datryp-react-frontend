import { useQuery } from '@tanstack/react-query';
import {
    fetchDestinationFit,
    type DestinationFitParams,
} from 'api/destinationFitApi';
import { useUser } from 'context/UserContext';

/**
 * The Pro "personal take" for a destination. Gated to paid/admin users (the
 * backend enforces Pro too); pass `null` to disable (e.g. free users, or before
 * the deterministic match resolves). The opinion is cached server-side per
 * user+destination, so a long `staleTime` avoids needless refetching.
 */
export const useDestinationFit = (params: DestinationFitParams | null) => {
    const { user, isAdmin } = useUser();
    const isPro = Boolean(user?.isPaidMember) || isAdmin;
    const enabled = Boolean(user && isPro && params?.name);
    return useQuery({
        queryKey: [
            'destination-fit',
            params?.kind,
            params?.name,
            params?.country,
        ],
        queryFn: () => fetchDestinationFit(params as DestinationFitParams),
        enabled,
        staleTime: 30 * 60 * 1000,
        retry: 0,
    });
};
