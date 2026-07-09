export type DeckSummary = {
  id: string;
  title: string;
  description: string | null;
  cardsCount: number;
  fsrsEnabled: boolean;
};

export type CardDto = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  tags: string[];
};
