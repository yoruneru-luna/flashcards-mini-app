export type Platform = "telegram" | "vk" | "dev";
export type ReviewRating = "again" | "hard" | "good" | "easy";
export type ReviewMode = "basic" | "written" | "audio";

export type MiniAppUser = {
  id: string;
  email: string | null;
  platform: Platform;
};

export type DeckSummary = {
  id: string;
  title: string;
  description: string | null;
  cardsCount: number;
  fsrsEnabled: boolean;
};
