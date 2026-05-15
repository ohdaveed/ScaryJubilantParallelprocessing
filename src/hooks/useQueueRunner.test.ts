/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runQueue, useQueueRunner } from './useQueueRunner';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import type { TodoItem, PageDraft } from '../types';

// Mock dependencies
vi.mock('../api', () => ({
  todosApi: {
    updateQueue: vi.fn().mockImplementation(async (id: number, fields: Partial<TodoItem>) => ({
      id,
      topic: 'A',
      userType: 'U',
      status: fields.status,
      done: fields.status === 'done',
      errorMessage: fields.errorMessage ?? null,
      builtPageId: fields.builtPageId ?? null,
      karlGrade: fields.karlGrade ?? null,
      plannedId: null
    }))
  }
}));

import { todosApi } from '../api';

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
    
    expect(setTodos).toHaveBeenCalledTimes(4); // optimistic + persisted updates for generating and done
  });

  it('does not let stale persistence responses regress queue status', async () => {
    const todos: TodoItem[] = [
      { id: 1, topic: 'A', userType: 'U', status: 'pending', done: false, errorMessage: null, builtPageId: null, karlGrade: null, plannedId: null },
    ];
    let resolveGenerating: (todo: TodoItem) => void = () => {};
    vi.mocked(todosApi.updateQueue)
      .mockImplementationOnce(() => new Promise<TodoItem>((resolve) => {
        resolveGenerating = resolve;
      }))
      .mockResolvedValueOnce({
        ...todos[0],
        status: 'done',
        done: true,
        builtPageId: 'page_A',
        karlGrade: 'B'
      });
    const generate = vi.fn().mockResolvedValue({ id: 'page_A', karlEvaluation: { grade: 'B' } } as unknown as PageDraft);

    const { result } = renderHook(() => {
      const [items, setItems] = useState(todos);
      return {
        items,
        runner: useQueueRunner({ todos: items, setTodos: setItems, generate })
      };
    });

    await act(async () => {
      await result.current.runner.start();
    });
    expect(result.current.items[0].status).toBe('done');

    await act(async () => {
      resolveGenerating({ ...todos[0], status: 'generating' });
    });

    expect(result.current.items[0].status).toBe('done');
    expect(result.current.items[0].builtPageId).toBe('page_A');
  });
});
