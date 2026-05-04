/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runQueue, useQueueRunner } from './useQueueRunner';
import { renderHook, act } from '@testing-library/react';
import type { TodoItem, PageDraft } from '../types';

// Mock dependencies
vi.mock('../utils', () => ({
  todosApi: {
    updateQueue: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('runQueue (pure function)', () => {
  it('should process pending todos and skip non-pending ones', async () => {
    const todos: TodoItem[] = [
      { id: 1, topic: 'A', userType: 'U', status: 'pending', done: false, errorMessage: null, builtPageId: null, karlGrade: null, plannedId: null },
      { id: 2, topic: 'B', userType: 'U', status: 'done', done: true, errorMessage: null, builtPageId: 'page_B', karlGrade: 'A', plannedId: null },
      { id: 3, topic: 'C', userType: 'U', status: 'pending', done: false, errorMessage: null, builtPageId: null, karlGrade: null, plannedId: null },
    ];
    
    const generate = vi.fn().mockImplementation(async (todo: TodoItem) => {
      return { id: `page_${todo.topic}`, karlEvaluation: { grade: 'A' } } as unknown as PageDraft;
    });
    
    const onUpdate = vi.fn();
    const shouldStop = vi.fn().mockReturnValue(false);
    
    const result = await runQueue(todos, generate, onUpdate, shouldStop);
    
    expect(result).toEqual({ attempted: 2, succeeded: 2, failed: 0 });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ id: 1, topic: 'A', userType: 'U' }));
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ id: 3, topic: 'C', userType: 'U' }));
    
    expect(onUpdate).toHaveBeenCalledWith(1, { status: 'generating' });
    expect(onUpdate).toHaveBeenCalledWith(1, { status: 'done', builtPageId: 'page_A', karlGrade: 'A' });
    expect(onUpdate).toHaveBeenCalledWith(3, { status: 'generating' });
    expect(onUpdate).toHaveBeenCalledWith(3, { status: 'done', builtPageId: 'page_C', karlGrade: 'A' });
  });

  it('should stop early when shouldStop returns true', async () => {
    const todos: TodoItem[] = [
      { id: 1, topic: 'A', userType: 'U', status: 'pending', done: false, errorMessage: null, builtPageId: null, karlGrade: null, plannedId: null },
      { id: 2, topic: 'B', userType: 'U', status: 'pending', done: false, errorMessage: null, builtPageId: null, karlGrade: null, plannedId: null },
    ];
    
    const generate = vi.fn().mockResolvedValue({ id: 'page' } as PageDraft);
    const onUpdate = vi.fn();
    
    // Stop after the first one
    let callCount = 0;
    const shouldStop = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount > 1; // false first time, true second time
    });
    
    const result = await runQueue(todos, generate, onUpdate, shouldStop);
    
    expect(result).toEqual({ attempted: 1, succeeded: 1, failed: 0 });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledTimes(2); // generating, done for id=1
  });

  it('should handle generate failures gracefully', async () => {
    const todos: TodoItem[] = [
      { id: 1, topic: 'A', userType: 'U', status: 'pending', done: false, errorMessage: null, builtPageId: null, karlGrade: null, plannedId: null },
    ];
    
    const generate = vi.fn().mockRejectedValue(new Error('Network error'));
    const onUpdate = vi.fn();
    const shouldStop = vi.fn().mockReturnValue(false);
    
    const result = await runQueue(todos, generate, onUpdate, shouldStop);
    
    expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1 });
    expect(onUpdate).toHaveBeenCalledWith(1, { status: 'generating' });
    expect(onUpdate).toHaveBeenCalledWith(1, { status: 'failed', errorMessage: 'Network error' });
  });
});

describe('useQueueRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should manage queue state correctly', async () => {
    const todos: TodoItem[] = [
      { id: 1, topic: 'A', userType: 'U', status: 'pending', done: false, errorMessage: null, builtPageId: null, karlGrade: null, plannedId: null },
    ];
    const setTodos = vi.fn();
    const generate = vi.fn().mockResolvedValue({ id: 'page_A', karlEvaluation: { grade: 'B' } } as unknown as PageDraft);
    
    const { result } = renderHook(() => useQueueRunner({ todos, setTodos, generate }));
    
    expect(result.current.running).toBe(false);
    
    await act(async () => {
      await result.current.start();
    });
    
    expect(setTodos).toHaveBeenCalledTimes(2); // status: generating, status: done
  });
});