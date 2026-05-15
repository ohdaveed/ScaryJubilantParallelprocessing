const PEST_KW = [
  "bed bug", "pest", "rodent", "cockroach", "vermin", "infestation", "rat", "mouse"
];

export const isPest = (t: string): boolean => {
  return PEST_KW.some(k => t.toLowerCase().includes(k));
};

export const clean = (s?: string): string => {
  return (s || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_{2}/g, "")
    .replace(/_/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/`/g, "")
    .replace(/^\s*[-–]\s*/gm, "")
    .trim();
};

export const lsLegacy = {
  listPageKeys: (): string[] =>
    Object.keys(localStorage).filter(k => k.startsWith("hhvc:") && k !== "hhvc:todos"),
  getPage: (key: string): string | null => localStorage.getItem(key),
  removePage: (key: string): void => { localStorage.removeItem(key); },
  getTodos: (): string | null => localStorage.getItem("hhvc:todos"),
  removeTodos: (): void => { localStorage.removeItem("hhvc:todos"); }
};
