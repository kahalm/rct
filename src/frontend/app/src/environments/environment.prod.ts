import { APP_VERSION } from './changelog';

/** Analyse-Ziel des „Analyze"-Knopfs (nach dem Bewerten): RookHubs Analysebrett — es liest
 *  `fen` + `orientation` aus der Query und ist ohne Anmeldung nutzbar. RCT hat bewusst keinen
 *  eigenen Engine-Modus. Hier zentral, damit die Adresse an EINER Stelle steht. */
export const ANALYSIS_URL = 'https://rookhub.oberschmid.homes/analysis';

export const environment = { production: true, version: APP_VERSION };
