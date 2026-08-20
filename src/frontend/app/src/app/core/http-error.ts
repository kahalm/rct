/**
 * Fehlermeldung aus einer HTTP-Fehlerantwort ziehen — EINE Stelle für das Muster,
 * das vorher in jeder Komponente kopiert war (und in Kopien gern den `errors`-Zweig
 * verlor). Deckt beide API-Fehlerformen ab:
 * - unsere Controller: `{ message: "..." }`
 * - ASP.NET-ModelState (ValidationProblemDetails): `{ errors: { Feld: ["...", ...] } }`
 */
export function extractHttpErrorMessage(err: any, fallback: string): string {
  return err?.error?.message
    || (err?.error?.errors && Object.values(err.error.errors).flat().join(' '))
    || fallback;
}
