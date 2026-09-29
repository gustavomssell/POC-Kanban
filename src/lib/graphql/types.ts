export type CardDTO = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  labels: string[];
  columnId: string;
};

export type ColumnDTO = {
  id: string;
  title: string;
  order: number;
  cards: CardDTO[];
};

export type BoardData = {
  columns: ColumnDTO[];
  labels: string[];
};

export type CardFormData = {
  title: string;
  description?: string;
  labels: string[];
  columnId: string;
};
