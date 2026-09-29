export const typeDefs = /* GraphQL */ `
  type Column {
    id: ID!
    title: String!
    order: Int!
    cards(search: String, labels: [String!]): [Card!]!
  }

  type Card {
    id: ID!
    title: String!
    description: String
    order: Int!
    labels: [String!]!
    columnId: String!
    column: Column!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    columns: [Column!]!
    cards(search: String, labels: [String!]): [Card!]!
    card(id: ID!): Card
    labels: [String!]!
  }

  input CreateColumnInput {
    title: String!
  }

  input CreateCardInput {
    title: String!
    description: String
    columnId: String!
    labels: [String!]
  }

  input UpdateCardInput {
    title: String
    description: String
    labels: [String!]
  }

  type Mutation {
    createColumn(input: CreateColumnInput!): Column!
    renameColumn(id: ID!, title: String!): Column!
    moveColumn(id: ID!, order: Int!): Column!
    deleteColumn(id: ID!): Boolean!

    createCard(input: CreateCardInput!): Card!
    updateCard(id: ID!, input: UpdateCardInput!): Card!
    moveCard(id: ID!, columnId: String!, order: Int!): Card!
    deleteCard(id: ID!): Boolean!
    seed: Boolean!
  }
`;
