import { describe, it, expect } from 'vitest';
import { parseSupabaseError, getErrorMessage } from './errors';

describe('parseSupabaseError', () => {
  it('should parse PostgreSQL unique constraint violation', () => {
    const error = {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
    };
    const result = parseSupabaseError(error);

    expect(result.message).toBe('Este registro já existe no sistema');
    expect(result.code).toBe('23505');
    expect(result.isOperational).toBe(true);
  });

  it('should parse PostgreSQL foreign key violation', () => {
    const error = {
      code: '23503',
      message: 'violates foreign key constraint',
    };
    const result = parseSupabaseError(error);

    expect(result.message).toBe('Este registro está sendo usado por outros dados');
    expect(result.code).toBe('23503');
  });

  it('should parse PostgreSQL not null violation', () => {
    const error = {
      code: '23502',
      message: 'null value in column "name" violates not-null constraint',
    };
    const result = parseSupabaseError(error);

    expect(result.message).toBe('Campos obrigatórios não foram preenchidos');
    expect(result.code).toBe('23502');
  });

  it('should handle authentication errors', () => {
    const error = {
      message: 'Invalid login credentials',
      status: 401,
    };
    const result = parseSupabaseError(error);

    expect(result.message).toContain('credenciais');
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');
    const result = parseSupabaseError(error);

    expect(result.message).toBe('Something went wrong');
    expect(result.isOperational).toBe(false);
  });

  it('should handle unknown error types', () => {
    const error = 'string error';
    const result = parseSupabaseError(error);

    expect(result.message).toBe('Ocorreu um erro inesperado');
    expect(result.code).toBe('UNKNOWN');
  });

  it('should handle null/undefined errors', () => {
    const result1 = parseSupabaseError(null);
    const result2 = parseSupabaseError(undefined);

    expect(result1.message).toBe('Ocorreu um erro inesperado');
    expect(result2.message).toBe('Ocorreu um erro inesperado');
  });
});

describe('getErrorMessage', () => {
  it('should extract message from Error object', () => {
    const error = new Error('Test error message');
    expect(getErrorMessage(error)).toBe('Test error message');
  });

  it('should extract message from object with message property', () => {
    const error = { message: 'Custom error message' };
    expect(getErrorMessage(error)).toBe('Custom error message');
  });

  it('should convert string to message', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('should handle objects without message', () => {
    const error = { code: '500', details: 'Something failed' };
    const message = getErrorMessage(error);
    expect(message).toBe('Ocorreu um erro inesperado');
  });

  it('should handle null and undefined', () => {
    expect(getErrorMessage(null)).toBe('Ocorreu um erro inesperado');
    expect(getErrorMessage(undefined)).toBe('Ocorreu um erro inesperado');
  });

  it('should handle numbers', () => {
    expect(getErrorMessage(404)).toBe('Ocorreu um erro inesperado');
  });
});
