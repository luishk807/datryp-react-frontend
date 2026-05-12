import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { pythonGqlClient } from 'api/pythonGqlClient';
import { queryKeys } from 'api/queryKeys';
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
            const data = await pythonGqlClient.request<QueryResult>(
                RECOMMEND_COUNTRIES_QUERY,
                { input: payload }
            );
            return data.recommendCountries;
        },
        enabled: (options?.enabled ?? true) && payload.query.trim().length > 0,
        placeholderData: keepPreviousData,
    });
