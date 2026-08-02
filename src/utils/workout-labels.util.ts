export const RUNNING_WORKOUT_TITLE_LABELS: Record<string, string> = {
  ALTERNANDO_RITMO: 'Alternando ritmo',
  COMPETICAO: 'Competição',
  CONTRARRELOGIO: 'Contrarrelógio',
  FARTLEK: 'Fartlek',
  HIIT_CURTO: 'Hiit Curto',
  HIT_ELEVACAO: 'Hiit com elevação',
  HIIT_ELEVACAO: 'Hiit com elevação',
  HIITT_LONGO: 'Hiit Longo',
  HIIT_LONGO: 'Hiit Longo',
  LL1: 'LL1',
  LL2_INTERVALADO: 'LL2 intervalado',
  LL2_RITMADO: 'LL2 ritmado',
  LONGAO: 'Longão',
  PROGRASSIVO: 'Progressivo',
  PROGRESSIVO: 'Progressivo',
  RODAGEM: 'Rodagem',
  SPRINT: 'Sprint',
  TESTE_FISICO: 'Teste Físico',
  FORCA: 'Força',
};

export const STRAVA_ACTIVITY_TYPE_LABELS: Record<string, string> = {
  RUN: 'Corrida livre',
  VIRTUAL_RUN: 'Corrida virtual',
  TRAIL_RUN: 'Corrida em trilha',
  WALK: 'Caminhada',
};

function toStringValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length ? normalized : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

export function normalizeWorkoutTitleKey(value?: unknown): string | null {
  const normalizedValue = toStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

export function formatRunningWorkoutTitle(value?: unknown): string | null {
  const normalizedKey = normalizeWorkoutTitleKey(value);

  if (!normalizedKey) {
    return null;
  }

  return RUNNING_WORKOUT_TITLE_LABELS[normalizedKey] ?? toStringValue(value);
}

export function formatStravaActivityTypeLabel(value?: unknown): string | null {
  const normalizedKey = normalizeWorkoutTitleKey(value);

  if (!normalizedKey) {
    return null;
  }

  return STRAVA_ACTIVITY_TYPE_LABELS[normalizedKey] ?? toStringValue(value);
}
