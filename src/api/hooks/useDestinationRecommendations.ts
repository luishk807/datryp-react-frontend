import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { pythonGqlClient } from 'api/pythonGqlClient';
import { queryKeys } from 'api/queryKeys';
import type {
    DestinationRecommendationRequest,
    RecommendationResponse,
} from 'types';

const RECOMMEND_DESTINATIONS_QUERY = gql`
    query RecommendDestinations($input: DestinationRecommendationInput!) {
        recommendDestinations(input: $input) {
            modelVersion
            items {
                id
                slug
                name
                country
                score
                reason
            }
        }
    }
`;

interface QueryResult {
    recommendDestinations: RecommendationResponse;
}

export const useDestinationRecommendations = (
    payload: DestinationRecommendationRequest,
    options?: { enabled?: boolean }
) =>
    useQuery({
        queryKey: queryKeys.recommendations.destinations(payload.query),
        queryFn: async () => {
            const data = await pythonGqlClient.request<QueryResult>(
                RECOMMEND_DESTINATIONS_QUERY,
                { input: payload }
            );
            return data.recommendDestinations;
        },
        enabled: (options?.enabled ?? true) && payload.query.trim().length > 0,
        placeholderData: keepPreviousData,
    });
