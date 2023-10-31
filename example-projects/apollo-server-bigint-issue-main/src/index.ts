import {
  ApolloServer
} from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import fetch from 'node-fetch';

import GraphQLBigInt from './GraphQLBigInt';

const typeDefs = `#graphql
  scalar BigInt
  type Region {
    id: Int!
    population: BigInt!
  }
  type Query {
    region: Region
  }
`;

const resolvers = {
  BigInt: GraphQLBigInt,
  Query: {
    region: () => ({
      id: 1,
      population: 100n,
    }),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

(async () => {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });
  console.log(`🚀 Server ready at ${url}`);

  // Test the server
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query {
          region {
            id
            population
          }
        }
      `,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error(`HTTP error! status: ${response.status} ${JSON.stringify(data, null, 2)}`);
  }
})()
