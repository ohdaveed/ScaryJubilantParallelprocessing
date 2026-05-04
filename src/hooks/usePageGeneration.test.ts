// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePageGeneration } from './usePageGeneration';
import { renderHook, act, waitFor } from '@testing-library/react';
import { fetchKarlRemediation, improveStructure, parsePage, runKarlEvaluation } from '../utils';
import { validateGeneratedPage } from '../generationValidation';
import { streamModelText } from '../services/chatStream';

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
  fetchKarlRemediation: vi.fn().mockResolvedValue({
    consulted: false,
    guidance: [],
    error: null
  }),
  improveStructure: vi.fn().mockResolvedValue(null),
  runKarlEvaluation: vi.fn().mockResolvedValue({ grade: 'A' }),
  evaluateQualityGate: vi.fn().mockReturnValue({ status: 'pass', reasons: ['Meets automatic quality gate.'] }),
  parsePage: vi.fn().mockReturnValue({ valid: true })
}));

vi.mock('../generationValidation', () => ({
  validateGeneratedPage: vi.fn().mockReturnValue({ ok: true, failures: [], warnings: [] })
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

  it('should improve the page again when Karl evaluation fails checks', async () => {
    vi.mocked(improveStructure)
      .mockResolvedValueOnce('first improved raw')
      .mockResolvedValueOnce('second improved raw');

    vi.mocked(parsePage)
      .mockReturnValueOnce({
        valid: true,
        raw: 'first improved raw',
        name: 'Test Page',
        draft: 'First improved draft',
        pageType: 'Transaction',
        userType: 'Resident'
      } as never)
      .mockReturnValueOnce({
        valid: true,
        raw: 'second improved raw',
        name: 'Test Page',
        draft: 'Second improved draft',
        pageType: 'Transaction',
        userType: 'Resident'
      } as never);

    vi.mocked(runKarlEvaluation)
      .mockResolvedValueOnce({
        score: 62,
        grade: 'D',
        summary: 'Needs clearer actions.',
        passed: [],
        warnings: ['Lead with the main point.'],
        failed: ['Sentence beginning "You must contact..." exceeds 20 words.'],
        parseError: false
      } as never)
      .mockResolvedValueOnce({
        score: 91,
        grade: 'A',
        summary: 'Clear and actionable.',
        passed: ['Uses direct language.'],
        warnings: [],
        failed: [],
        parseError: false
      } as never);

    const { evaluateQualityGate } = await import('../utils');
    vi.mocked(evaluateQualityGate)
      .mockReturnValueOnce({ status: 'review_required', reasons: ['1 evaluator checks failed.'] } as never)
      .mockReturnValueOnce({ status: 'pass', reasons: ['Meets automatic quality gate.'] } as never);

    const { result } = renderHook(() => usePageGeneration(defaultParams));

    let page;
    await act(async () => {
      result.current.actions.setTopic('Test Topic');
    });

    await act(async () => {
      page = await result.current.generate({ quiet: true });
    });

    expect(improveStructure).toHaveBeenCalledTimes(2);
    expect(improveStructure).toHaveBeenLastCalledWith(
      'first improved raw',
      [],
      expect.objectContaining({
        score: 62,
        grade: 'D'
      })
    );
    expect(runKarlEvaluation).toHaveBeenCalledTimes(2);
    expect(page?.draft).toBe('Second improved draft');
    expect(page?.karlEvaluation?.grade).toBe('A');
  });

  it('consults Karl remediation after a failing evaluation', async () => {
    vi.mocked(improveStructure)
      .mockResolvedValueOnce('first improved raw')
      .mockResolvedValueOnce('second improved raw');

    vi.mocked(parsePage)
      .mockReturnValueOnce({
        valid: true,
        raw: 'first improved raw',
        name: 'Test Page',
        draft: 'First improved draft',
        pageType: 'Transaction',
        userType: 'Resident'
      } as never)
      .mockReturnValueOnce({
        valid: true,
        raw: 'second improved raw',
        name: 'Test Page',
        draft: 'Second improved draft',
        pageType: 'Transaction',
        userType: 'Resident'
      } as never);

    vi.mocked(runKarlEvaluation)
      .mockResolvedValueOnce({
        score: 62,
        grade: 'D',
        summary: 'Needs clearer actions.',
        passed: [],
        warnings: ['Lead with the main point.'],
        failed: ['Use What to do and Related sections.'],
        parseError: false
      } as never)
      .mockResolvedValueOnce({
        score: 91,
        grade: 'A',
        summary: 'Clear and actionable.',
        passed: ['Uses direct language.'],
        warnings: [],
        failed: [],
        parseError: false
      } as never);

    const { evaluateQualityGate } = await import('../utils');
    vi.mocked(evaluateQualityGate)
      .mockReturnValueOnce({ status: 'review_required', reasons: ['1 evaluator checks failed.'] } as never)
      .mockReturnValueOnce({ status: 'pass', reasons: ['Meets automatic quality gate.'] } as never);

    vi.mocked(fetchKarlRemediation).mockResolvedValueOnce({
      consulted: true,
      guidance: ['Use a Transaction page with What to do and Related sections.'],
      error: null
    } as never);

    const { result } = renderHook(() => usePageGeneration(defaultParams));

    await act(async () => {
      result.current.actions.setTopic('Test Topic');
    });

    await act(async () => {
      await result.current.generate({ quiet: true });
    });

    expect(fetchKarlRemediation).toHaveBeenCalledWith({
      raw: 'first improved raw',
      pageType: 'Transaction',
      evaluation: expect.objectContaining({
        score: 62,
        grade: 'D'
      })
    });
    expect(fetchKarlRemediation.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(improveStructure).mock.invocationCallOrder[1]
    );
    expect(vi.mocked(improveStructure)).toHaveBeenLastCalledWith(
      'first improved raw',
      [],
      expect.objectContaining({
        warnings: [
          'Lead with the main point.',
          'Use a Transaction page with What to do and Related sections.'
        ]
      })
    );
  });

  it('shows Consulting Karl progress during failing-grade remediation', async () => {
    vi.mocked(improveStructure)
      .mockResolvedValueOnce('first improved raw')
      .mockResolvedValueOnce('second improved raw');

    vi.mocked(parsePage)
      .mockReturnValueOnce({
        valid: true,
        raw: 'first improved raw',
        name: 'Test Page',
        draft: 'First improved draft',
        pageType: 'Transaction',
        userType: 'Resident'
      } as never)
      .mockReturnValueOnce({
        valid: true,
        raw: 'second improved raw',
        name: 'Test Page',
        draft: 'Second improved draft',
        pageType: 'Transaction',
        userType: 'Resident'
      } as never);

    vi.mocked(runKarlEvaluation)
      .mockResolvedValueOnce({
        score: 62,
        grade: 'D',
        summary: 'Needs clearer actions.',
        passed: [],
        warnings: ['Lead with the main point.'],
        failed: ['Use What to do and Related sections.'],
        parseError: false
      } as never)
      .mockResolvedValueOnce({
        score: 91,
        grade: 'A',
        summary: 'Clear and actionable.',
        passed: ['Uses direct language.'],
        warnings: [],
        failed: [],
        parseError: false
      } as never);

    const { evaluateQualityGate } = await import('../utils');
    vi.mocked(evaluateQualityGate)
      .mockReturnValueOnce({ status: 'review_required', reasons: ['1 evaluator checks failed.'] } as never)
      .mockReturnValueOnce({ status: 'pass', reasons: ['Meets automatic quality gate.'] } as never);

    let resolveKarlRemediation: ((value: {
      consulted: boolean;
      guidance: string[];
      error: null;
    }) => void) | null = null;
    vi.mocked(fetchKarlRemediation).mockImplementationOnce(() => new Promise((resolve) => {
      resolveKarlRemediation = resolve;
    }) as never);

    const { result } = renderHook(() => usePageGeneration(defaultParams));

    await act(async () => {
      result.current.actions.setTopic('Test Topic');
    });

    let generationPromise: Promise<unknown>;
    act(() => {
      generationPromise = result.current.generate({ quiet: true });
    });

    await waitFor(() => {
      expect(result.current.progressLabel).toBe('Consulting Karl...');
    });

    resolveKarlRemediation?.({
      consulted: true,
      guidance: ['Use a Transaction page with What to do and Related sections.'],
      error: null
    });

    await act(async () => {
      await generationPromise;
    });
  });

  it('retries invalid generated pages up to 2 times before accepting output', async () => {
    vi.mocked(validateGeneratedPage)
      .mockReturnValueOnce({ ok: false, failures: ['Invalid page type'], warnings: [] } as never)
      .mockReturnValueOnce({ ok: true, failures: [], warnings: [] } as never);

    const { result } = renderHook(() => usePageGeneration(defaultParams));

    await act(async () => {
      result.current.actions.setTopic('Test Topic');
    });

    let page;
    await act(async () => {
      page = await result.current.generate({ quiet: true });
    });

    expect(page).toBeDefined();
    expect(vi.mocked(streamModelText)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(validateGeneratedPage)).toHaveBeenCalledTimes(2);
  });
});
