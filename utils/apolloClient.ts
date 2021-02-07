import moment from 'moment';
import { useMemo } from "react";
import { ApolloClient, gql, HttpLink, InMemoryCache, makeVar } from "@apollo/client";

let apolloClient;

const typeDefs  = gql`
  extend type StockSummary {
    status: String!
    unitPrice: Int!
    profitRate: Int
  }
`;

export const makeUserData = (info: Record<string, any>) => {
  // pe: price per earnings
  // eps: earning per share
  // price: eps * pe
  const { previousClose, unitPrice, peRatio, eps, earningsDate } = info;

  const intPERatio = parseFloat(peRatio);
  const intEps = parseFloat(eps);
  const [from, to] = earningsDate.split(' - ');
  const isCloseToEarningsDate = moment().isBetween(
    moment(new Date(to || from)).subtract(1, 'months'),
    moment(new Date(to || from)),
  );

  if (unitPrice === 0) {
    let status;
    switch (true) {
      case (peRatio > 100):
        status = 'hold';
        break;
      case (intEps > 0):
        status = 'buy';
        break;
      default:
        status = 'hold';
    }

    return {
      status,
      profitRate: 0,
    };
  }

  const hasProfit = parseFloat(previousClose) > unitPrice;
  const profitRate = ((parseFloat(previousClose) - unitPrice) / unitPrice) * 100;
  const common = { profitRate };
  if (isCloseToEarningsDate && hasProfit) {
    return { ...common, status: 'hold' };
  };

  if (hasProfit) {
    let status: string;
    switch (true) {
      case (profitRate > 50):
        status = 'sell';
        break;
      case (intPERatio > 100):
        status = 'sell';
        break;
      case (intEps > 0 && intPERatio < 50):
        status = 'buy';
        break;
      case (intEps > 0):
        status = 'hold';
        break;
      default:
        status = 'hold';
    }

    return {
      ...common,
      status,
    };
  } else {
    let status: string;
    switch (true) {
      case (profitRate > -30):
        status = 'hold';
        break;
      case (intPERatio > 100):
        status = 'sell';
        break;
      case (intEps > 0 && intPERatio < 50):
        status = 'buy';
        break;
      case (intEps > 0):
        status = 'hold';
        break;
      default:
        status = 'hold';
    }

    return {
      ...common,
      status,
    };
  }
}

export const userDataCache =
  makeVar<Record<string, { status?: string; unitPrice?: number; }>>({});

const readMultipleField = (readField: (string) => any, fieldName: string[]) => {
  const result = fieldName.reduce((current, next) => {
    current[next] = readField(next);
    return current;
  }, {} as Record<string, any>);

  return result;
}

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
                const { code, ...record } = readMultipleField(
                  readField,
                  ['code', 'earningsDate', 'previousClose', 'peRatio', 'eps'],
                );
                const prev = userDataCache();

                if (!prev[code]) {
                  const unitPrice = localStorage.getItem(`_${code}unitPrice`) || '0';
                  const intUnitPrice = parseFloat(unitPrice);

                  userDataCache({
                    ...prev,
                    [code]: {
                      unitPrice: intUnitPrice,
                      ...makeUserData({
                        ...record,
                        unitPrice: intUnitPrice,
                      })
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