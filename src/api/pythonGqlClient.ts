import { GraphQLClient } from 'graphql-request';
import { getAuthToken, subscribeAuthToken } from './authStorage';

/**
 * GraphQL client for the DaTryp.com Python backend (recommender, ML, analytics,
 * auth-gated queries like `friends` and `myItineraries`).
 *
 * The existing `graphqlClient` in this folder targets the Node backend at
 * port 4000. This sibling client targets the Python backend at port 8000
 * and auto-syncs its Authorization header with `authStorage`.
 */

const endpoint =
    import.meta.env.VITE_PYTHON_GRAPHQL_URL ?? 'http://localhost:8000/graphql';

export const pythonGqlClient = new GraphQLClient(endpoint);

const applyToken = (token: string | null): void => {
    if (token) {
        pythonGqlClient.setHeader('Authorization', `Bearer ${token}`);
    } else {
        // Replace the header set; passing `{}` clears the Authorization header.
        pythonGqlClient.setHeaders({});
    }
};

applyToken(getAuthToken());
subscribeAuthToken(applyToken);
