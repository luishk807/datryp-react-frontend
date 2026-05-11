import { GraphQLClient } from 'graphql-request';

/**
 * GraphQL client for the daTryp Python backend (recommender, ML, analytics).
 *
 * The existing `graphqlClient` in this folder targets the Node backend at
 * port 4000. This sibling client targets the Python backend at port 8000.
 */

const endpoint =
    import.meta.env.VITE_PYTHON_GRAPHQL_URL ?? 'http://localhost:8000/graphql';

export const pythonGqlClient = new GraphQLClient(endpoint);
