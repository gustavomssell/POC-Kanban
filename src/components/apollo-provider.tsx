"use client";

import React from "react";
import { ApolloProvider } from "@apollo/client/react";
import { makeApolloClient } from "@/lib/apollo-client";

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => makeApolloClient());
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
