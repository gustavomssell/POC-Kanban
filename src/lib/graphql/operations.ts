import { gql } from "@apollo/client";

export const GET_BOARD = gql`
  query GetBoard($search: String, $labels: [String!]) {
    columns {
      id
      title
      order
      cards(search: $search, labels: $labels) {
        id
        title
        description
        order
        labels
        columnId
      }
    }
    labels
  }
`;

export const CREATE_CARD = gql`
  mutation CreateCard($input: CreateCardInput!) {
    createCard(input: $input) {
      id
      title
      columnId
      order
    }
  }
`;

export const UPDATE_CARD = gql`
  mutation UpdateCard($id: ID!, $input: UpdateCardInput!) {
    updateCard(id: $id, input: $input) {
      id
      title
      description
      labels
      columnId
      order
    }
  }
`;

export const MOVE_CARD = gql`
  mutation MoveCard($id: ID!, $columnId: String!, $order: Int!) {
    moveCard(id: $id, columnId: $columnId, order: $order) {
      id
      columnId
      order
    }
  }
`;

export const DELETE_CARD = gql`
  mutation DeleteCard($id: ID!) {
    deleteCard(id: $id)
  }
`;

export const CREATE_COLUMN = gql`
  mutation CreateColumn($input: CreateColumnInput!) {
    createColumn(input: $input) {
      id
      title
    }
  }
`;

export const RENAME_COLUMN = gql`
  mutation RenameColumn($id: ID!, $title: String!) {
    renameColumn(id: $id, title: $title) {
      id
      title
    }
  }
`;

export const MOVE_COLUMN = gql`
  mutation MoveColumn($id: ID!, $order: Int!) {
    moveColumn(id: $id, order: $order) {
      id
      order
    }
  }
`;

export const DELETE_COLUMN = gql`
  mutation DeleteColumn($id: ID!) {
    deleteColumn(id: $id)
  }
`;

export const SEED = gql`
  mutation Seed {
    seed
  }
`;

// Re-export dos tipos (fonte única em ./types) para compatibilidade.
export type { BoardData, CardDTO, CardFormData, ColumnDTO } from "./types";
