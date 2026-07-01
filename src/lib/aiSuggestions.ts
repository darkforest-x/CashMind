import { MOCK_CATEGORIES } from '../data';

export type AiSuggestion = {
  cat: string;
  prob: number;
  label: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAiSuggestion(value: unknown): AiSuggestion | null {
  if (!isRecord(value) || typeof value.category !== 'string') {
    return null;
  }

  const probability = typeof value.probability === 'number' ? value.probability : Number(value.probability);
  if (!Number.isFinite(probability)) {
    return null;
  }

  const category = value.category;
  const categoryConfig = MOCK_CATEGORIES.find((item) => item.id === category);
  return {
    cat: category,
    prob: Math.round(probability * 100),
    label: categoryConfig ? categoryConfig.name : category,
  };
}

function isAiSuggestion(value: AiSuggestion | null): value is AiSuggestion {
  return value !== null;
}

export function parseAiSuggestions(value: unknown): AiSuggestion[] {
  return Array.isArray(value) ? value.map(parseAiSuggestion).filter(isAiSuggestion) : [];
}
