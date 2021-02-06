import { useMemo } from "react";
import { ApolloClient, gql, HttpLink, InMemoryCache, makeVar } from "@apollo/client";

let apolloClient;

const typeDefs  = gql`
  extend type StockSummary {
    status: String!
    unitPrice: String!
  }
`;

export const getRecommendedStatus = (unitPrice: number) => {
  if (unitPrice >= 50) {
    return 'sell';
  }

  if (unitPrice >= 30) {
    return 'hold';
  }

  return 'buy';
}

export const userDataCache =
  makeVar<Record<string, { status?: string; unitPrice?: string; }>>({});

function createApolloClient() {
  return new ApolloClient({
    typeDefs,
    ssrMode: typeof window === 'undefined',
    link: new HttpLink({ uri: '/api/graphql' }),
    cache: new InMemoryCache({
      typePolicies: {
        StockSummary: {
          fields: {
            userData: {
              read(_, { readField }) {
                const code = readField('code') as string;
                const prev = userDataCache();

                if (!prev[code]) {
                  const unitPrice = localStorage.getItem(`_${code}unitPrice`) || '0';
                  userDataCache({
                    ...prev,
                    [code]: {
                      unitPrice,
                      status: getRecommendedStatus(parseFloat(unitPrice)),
                    }
                  });
                }

                return userDataCache()[code];
              }
            },
          }
        }
      }
    }),
  });
}

export function initializeApollo(initialState = null) {
  const _apolloClient = apolloClient ?? createApolloClient();

  // If your page has Next.js data fetching methods that use Apollo Client,
  // the initial state gets hydrated here
  if (initialState) {
    // Get existing cache, loaded during client side data fetching
    const existingCache = _apolloClient.extract();

    // Restore the cache using the data passed from
    // getStaticProps/getServerSideProps combined with the existing cached data
    _apolloClient.cache.restore({ ...existingCache, ...initialState });
  }

  // For SSG and SSR always create a new Apollo Client
  if (typeof window === "undefined") return _apolloClient;

  // Create the Apollo Client once in the client
  if (!apolloClient) apolloClient = _apolloClient;
  return _apolloClient;
}

export function useApollo(initialState) {
  const client = useMemo(() => initializeApollo(initialState), [initialState]);
  return client;
}