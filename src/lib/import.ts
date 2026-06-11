// Shared shape for CSV import server actions + the generic ImportForm.

export type ImportRowResult = {
  line: number; // 1-based source line (header = 1, first data row = 2)
  label: string; // human label for the row (e.g. the person's name)
  ok: boolean;
  errors: string[]; // error codes, translated client-side via ImportErrors
};

export type ImportState = {
  error?: string; // global error code (empty file, no rows, …)
  ran?: "preview" | "commit";
  total?: number;
  validCount?: number;
  committed?: number;
  rows?: ImportRowResult[];
};
