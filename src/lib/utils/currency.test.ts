import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateTime } from './currency';

describe('formatCurrency', () => {
  it('should format positive numbers correctly', () => {
    expect(formatCurrency(1000)).toBe('R$ 1.000,00');
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
    expect(formatCurrency(0.5)).toBe('R$ 0,50');
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('should format negative numbers correctly', () => {
    expect(formatCurrency(-100)).toBe('-R$ 100,00');
    expect(formatCurrency(-1234.56)).toBe('-R$ 1.234,56');
  });

  it('should handle decimal precision', () => {
    expect(formatCurrency(10.999)).toBe('R$ 11,00');
    expect(formatCurrency(10.001)).toBe('R$ 10,00');
    expect(formatCurrency(10.5)).toBe('R$ 10,50');
  });

  it('should handle large numbers', () => {
    expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
    expect(formatCurrency(999999.99)).toBe('R$ 999.999,99');
  });
});

describe('formatDate', () => {
  it('should format ISO date strings correctly', () => {
    expect(formatDate('2024-01-15')).toBe('15/01/2024');
    expect(formatDate('2024-12-31')).toBe('31/12/2024');
  });

  it('should format datetime strings correctly', () => {
    expect(formatDate('2024-01-15T10:30:00')).toBe('15/01/2024');
    expect(formatDate('2024-12-31T23:59:59Z')).toBe('31/12/2024');
  });

  it('should handle different date formats', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date.toISOString())).toContain('15/01/2024');
  });
});

describe('formatDateTime', () => {
  it('should format datetime with time correctly', () => {
    const result = formatDateTime('2024-01-15T10:30:00');
    expect(result).toContain('15/01/2024');
    expect(result).toContain('10:30');
  });

  it('should format datetime with timezone correctly', () => {
    const result = formatDateTime('2024-12-31T23:59:00Z');
    expect(result).toContain('31/12/2024');
    // Time might vary based on local timezone
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('should handle midnight correctly', () => {
    const result = formatDateTime('2024-01-15T00:00:00');
    expect(result).toContain('15/01/2024');
    expect(result).toContain('00:00');
  });
});
