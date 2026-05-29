export type AppSearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  /** Вже локалізована назва групи */
  group: string;
  run: () => void;
  enabled?: () => boolean;
};
