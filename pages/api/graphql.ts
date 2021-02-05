import { ApolloServer, gql } from "apollo-server-micro";
import responseCachePlugin from "apollo-server-plugin-response-cache";

import dataSources from "../../dataSources";

const typeDefs = gql`
  type Query {
    stockSummaries(input: StockSummaryInput): [StockSummary]
      @cacheControl(maxAge: 3600)
  }

  type User {
    id: ID!
    email: String!
    createdAt: String!
    updatedAt: String!
    deletedAt: String
  }

  type StockHolding {
    id: ID!
    count: Int!
    userId: Int!
    stockCode: String!
  }

  type StockSummary {
    code: String!
    companyName: String!
    previousClose: String!
    open: String!
    bid: String!
    ask: String!
    daysRange: String!
    yearRange: String!
    volume: String!
    avgVolume: String!
    marketCap: String!
    beta: String!
    peRatio: String!
    eps: String!
    earningsDate: String!
    forwardDividendAndYield: String!
    exDividendDate: String!
    thisYearTargetEst: String!
    cacheId: String!
    fetchedAt: String!
  }

  input StockSummaryInput {
    yhCodeList: [String!]!
  }
`;

const resolvers = {
  Query: {
    async stockSummaries(parent, args, { dataSources }) {
      const { yahooFinanceAPI } = dataSources;
      return await yahooFinanceAPI.getSummaries(args.input.yhCodeList);
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources,
  plugins: [
    responseCachePlugin(),
  ]
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default server.createHandler({ path: "/api/graphql" });