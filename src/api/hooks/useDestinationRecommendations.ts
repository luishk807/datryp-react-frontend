import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { restClient } from 'api/restClient';
import { queryKeys } from 'api/queryKeys';
import type {
    DestinationRecommendationRequest,
    RecommendationResponse,
} from 'types';

export const useDestinationRecommendations = (
    payload: DestinationRecommendationRequest,
    options?: { enabled?: boolean }
) =>
    useQuery({
        queryKey: queryKeys.recommendations.destinations(payload.query),
        queryFn: async () => {
            const { data } = await restClient.post<RecommendationResponse>(
                '/recommendations/destinations',
                payload
            );
            return data;
        },
        enabled: (options?.enabled ?? true) && payload.query.trim().length > 0,
        placeholderData: keepPreviousData,
    });
