import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ClientError, gql } from 'graphql-request';
import { pythonGqlClient } from 'api/pythonGqlClient';
import { queryKeys } from 'api/queryKeys';
import { QueryBlockedError } from 'api/moderationError';
import type {
    CountryRecommendationRequest,
    CountryRecommendationResponse,
} from 'types';

const RECOMMEND_COUNTRIES_QUERY = gql`
    query RecommendCountries($input: CountryRecommendationInput!) {
        recommendCountries(input: $input) {
            modelVersion
            items {
                id
                name
                code
                local
                image
                score
                reason
            }
        }
    }
`;

interface QueryResult {
    recommendCountries: CountryRecommendationResponse;
}

export const useCountryRecommendations = (
    payload: CountryRecommendationRequest,
    options?: { enabled?: boolean }
) =>
    useQuery({
        queryKey: queryKeys.recommendations.countries(payload.query),
        queryFn: async () => {
            try {
                const data = await pythonGqlClient.request<QueryResult>(
                    RECOMMEND_COUNTRIES_QUERY,
                    { input: payload }
                );
                return data.recommendCountries;
            } catch (err) {
                // Travel-scope moderation hit on the resolver — rethrow as our
                // typed error so the consumer can render the soft message
                // instead of the generic network-error branch.
                if (err instanceof ClientError) {
                    const gqlError = err.response.errors?.find(
                        (e) => e.extensions?.code === 'QUERY_BLOCKED'
                    );
                    if (gqlError) {
                        const category =
                            typeof gqlError.extensions?.category === 'string'
                                ? gqlError.extensions.category
                                : 'other';
                        throw new QueryBlockedError(category);
                    }
                }
                throw err;
            }
        },
        enabled: (options?.enabled ?? true) && payload.query.trim().length > 0,
        placeholderData: keepPreviousData,
        // Don't re-run a blocked query — same input will block again.
        retry: (_failureCount, error) =>
            !(error instanceof QueryBlockedError),
    });
