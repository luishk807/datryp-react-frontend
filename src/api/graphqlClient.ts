import { GraphQLClient } from 'graphql-request';

const endpoint =
    import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql';

export const graphqlClient = new GraphQLClient(endpoint, {
    credentials: 'include',
});

export const setAuthToken = (token: string | null) => {
    if (token) {
        graphqlClient.setHeader('Authorization', `Bearer ${token}`);
    } else {
        graphqlClient.setHeaders({});
    }
};
