import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { graphqlClient } from 'api/graphqlClient';
import { queryKeys } from 'api/queryKeys';

const ME_QUERY = gql`
    query Me {
        me {
            id
            name
            email
        }
    }
`;

interface MeResponse {
    me: {
        id: string;
        name: string;
        email: string | null;
    };
}

export const useMe = () =>
    useQuery({
        queryKey: queryKeys.me,
        queryFn: () => graphqlClient.request<MeResponse>(ME_QUERY),
        select: (data) => data.me,
    });
