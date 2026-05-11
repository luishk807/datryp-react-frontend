export interface DestinationRecommendationRequest {
    query: string;
    interests?: string[];
    budget?: string | null;
    limit?: number;
}

export interface DestinationRecommendation {
    id: string;
    slug: string;
    name: string;
    country: string | null;
    score: number;
    reason: string | null;
}

export interface RecommendationResponse {
    items: DestinationRecommendation[];
    model_version: string;
}
