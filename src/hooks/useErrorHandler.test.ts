import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useErrorHandler } from './useErrorHandler';

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  describe('handleError', () => {
    it('should show error toast with default message', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Test error');

      result.current.handleError(error);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Erro',
          description: expect.stringContaining('Test error'),
        })
      );
    });

    it('should show error toast with custom context', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Database error');

      result.current.handleError(error, { context: 'Ao salvar dados' });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Ao salvar dados'),
        })
      );
    });

    it('should not show toast when silent is true', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Silent error');

      result.current.handleError(error, { silent: true });

      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should handle PostgreSQL errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        code: '23505',
        message: 'duplicate key',
      };

      result.current.handleError(error);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('já existe'),
        })
      );
    });
  });

  describe('handleAsyncError', () => {
    it('should execute operation successfully without errors', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const successOperation = vi.fn().mockResolvedValue('success');

      await result.current.handleAsyncError(successOperation);

      expect(successOperation).toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should catch and handle errors from async operations', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const failingOperation = vi.fn().mockRejectedValue(new Error('Async error'));

      await result.current.handleAsyncError(failingOperation);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: expect.stringContaining('Async error'),
        })
      );
    });

    it('should pass context to error handler', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const failingOperation = vi.fn().mockRejectedValue(new Error('Failed'));

      await result.current.handleAsyncError(failingOperation, {
        context: 'Ao processar requisição',
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Ao processar requisição'),
        })
      );
    });
  });

  describe('handleSupabaseOperation', () => {
    it('should return data when operation succeeds', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockData = { id: 1, name: 'Test' };
      const successOperation = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      const resultData = await result.current.handleSupabaseOperation(successOperation);

      expect(resultData).toEqual(mockData);
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should show success toast when successMessage is provided', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockData = { id: 1, name: 'Test' };
      const successOperation = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      await result.current.handleSupabaseOperation(successOperation, {
        successMessage: 'Operação concluída!',
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sucesso',
          description: 'Operação concluída!',
        })
      );
    });

    it('should handle Supabase errors', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const failingOperation = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'CONNECTION_ERROR' },
      });

      const resultData = await result.current.handleSupabaseOperation(failingOperation, {
        context: 'Ao conectar ao banco',
      });

      expect(resultData).toBeNull();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: expect.stringContaining('Ao conectar ao banco'),
        })
      );
    });

    it('should return null when operation throws', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const failingOperation = vi.fn().mockRejectedValue(new Error('Network error'));

      const resultData = await result.current.handleSupabaseOperation(failingOperation);

      expect(resultData).toBeNull();
      expect(mockToast).toHaveBeenCalled();
    });
  });
});
