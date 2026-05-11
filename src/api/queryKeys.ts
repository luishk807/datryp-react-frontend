export const queryKeys = {
    me: ['me'] as const,
    trips: {
        all: ['trips'] as const,
        list: (filter?: string) => ['trips', 'list', filter ?? 'all'] as const,
        detail: (id: number | string) => ['trips', 'detail', id] as const,
    },
    friends: ['friends'] as const,
    recommendations: {
        destinations: (query: string) =>
            ['recommendations', 'destinations', query] as const,
    },
};
