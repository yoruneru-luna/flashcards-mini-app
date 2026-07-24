export type DeckSummary = {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  categoryTitle: string | null;
  cardsCount: number;
  fsrsEnabled: boolean;
};

export type CategorySummary = {
  id: string;
  title: string;
  decksCount: number;
};

export type CardDto = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  dueAt: string | null;
  reps: number;
  reviewState: string;
  tags: string[];
};
