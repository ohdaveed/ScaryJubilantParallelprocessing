import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePageGeneration } from './usePageGeneration';
import { renderHook, act } from '@testing-library/react';

// Mock dependencies
vi.mock('../services/chatStream', () => ({
  streamModelText: vi.fn().mockResolvedValue({ karlHit: true })
}));

vi.mock('../services/pageParser', () => ({
  repairAndParseStructured: vi.fn().mockResolvedValue({
    parseResult: { valid: true },
    parsed: { valid: true, name: 'Test Page', draft: 'Content', pageType: 'Transaction' }
  })
}));

vi.mock('../utils', () => ({
  isPest: vi.fn().mockReturnValue(false),
  pagesApi: { save: vi.fn().mockResolvedValue(undefined) },
  preferencesApi: { create: vi.fn().mockResolvedValue(undefined) },
  versionsApi: { list: vi.fn().mockResolvedValue([]) },
  improveStructure: vi.fn().mockResolvedValue(null),
  runKarlEvaluation: vi.fn().mockResolvedValue({ grade: 'A' }),
  evaluateQualityGate: vi.fn().mockReturnValue('pass'),
  parsePage: vi.fn().mockReturnValue({ valid: true })
}));

describe('usePageGeneration', () => {
  const defaultParams = {
    pages: [],
    setPages: vi.fn(),
    plannedPages: [],
    linkPlannedPage: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => usePageGeneration(defaultParams));

    expect(result.current.loading).toBe(false);
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.state.topic).toBe('');
  });

  it('should not generate if topic is empty', async () => {
    const { result } = renderHook(() => usePageGeneration(defaultParams));

    const page = await act(async () => {
      // Call generate without setting a topic
      return await result.current.generate();
    });

    expect(page).toBeNull();
    expect(result.current.state.topicTouched).toBe(true);
  });

  it('should generate a page successfully', async () => {
    const { result } = renderHook(() => usePageGeneration(defaultParams));

    let page;
    await act(async () => {
      // Set topic via actions first
      result.current.actions.setTopic('Test Topic');
    });

    await act(async () => {
      page = await result.current.generate({ quiet: true });
    });

    expect(page).toBeDefined();
    expect(page?.name).toBe('Test Page');
    expect(defaultParams.setPages).toHaveBeenCalled();
  });
});