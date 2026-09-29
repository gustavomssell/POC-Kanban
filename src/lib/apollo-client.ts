import { HttpLink } from "@apollo/client";
import { ApolloClient, InMemoryCache } from "@apollo/client";

export function makeApolloClient() {
  return new ApolloClient({
    link: new HttpLink({
      uri: "/api/graphql",
      fetchOptions: { cache: "no-store" },
    }),
    cache: new InMemoryCache({
      typePolicies: {
        Column: { keyFields: ["id"] },
        Card: { keyFields: ["id"] },
      },
    }),
  });
}
