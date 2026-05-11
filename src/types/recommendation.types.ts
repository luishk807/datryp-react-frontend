export interface CountryRecommendationRequest {
    query: string;
    interests?: string[];
    budget?: string | null;
    limit?: number;
    userId?: string | null;
}

export interface CountryRecommendation {
    id: string;
    name: string;
    code: string;
    score: number;
    reason: string | null;
}

export interface CountryRecommendationResponse {
    items: CountryRecommendation[];
    modelVersion: string;
}
