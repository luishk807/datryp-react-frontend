import { useQuery } from '@tanstack/react-query';
import {
    fetchSimilarToSaves,
    type SimilarToSavesResult,
} from 'api/similarToSavesApi';
import { useUser } from 'context/UserContext';

/**
 * ML-driven "Similar to your saves" homepage hook. Backed by chroma
 * kNN on locally-computed embeddings — no per-call OpenAI cost, so
 * generous staleness is fine. The query itself takes single-digit ms
 * server-side; the bottleneck is the network round-trip.
 *
 * Hidden for anonymous viewers — the endpoint requires auth.
 */
export const useSimilarToSaves = () => {
    const { user } = useUser();
    return useQuery<SimilarToSavesResult>({
        queryKey: ['me', 'similar-to-saves'],
        queryFn: fetchSimilarToSaves,
        enabled: Boolean(user),
        staleTime: 15 * 60 * 1000,
        retry: 1,
    });
};
