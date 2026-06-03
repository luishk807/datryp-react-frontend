import { GraphQLClient } from 'graphql-request';
import { getAuthToken, subscribeAuthToken } from './authStorage';
import {
    isNetworkError,
    markServerReachable,
    markServerUnreachable,
} from './serverStatus';

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

export const pythonGqlClient = new GraphQLClient(endpoint, {
    // Single choke point for backend-reachability detection: ~every page
    // talks to the Python backend through this client. A successful reply
    // (even a GraphQL error response) proves the server is up; a network
    // failure flips the global `ServerGate` to "Site Currently Unavailable".
    responseMiddleware: (response) => {
        // A network failure (fetch rejected, no reply) means the backend is
        // down. Anything else — a clean response OR a GraphQL ClientError the
        // server returned — proves it's up.
        if (response instanceof Error && isNetworkError(response)) {
            markServerUnreachable();
            return;
        }
        markServerReachable();
    },
});

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
