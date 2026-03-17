import { describe, it, expect } from 'vitest';
import { setLocale, getLocale, t, formatDate, formatNumber, formatCurrency } from '../../utils/i18n';

describe('i18n Utils', () => {
  it('sets and gets locale', () => {
    setLocale('af');
    expect(getLocale()).toBe('af');
    
    setLocale('zu');
    expect(getLocale()).toBe('zu');
    
    // Reset to English
    setLocale('en');
  });

  it('translates strings correctly', () => {
    setLocale('en');
    expect(t('auth.signIn')).toBe('Sign In');
    
    setLocale('af');
    expect(t('auth.signIn')).toBe('Teken In');
    
    setLocale('zu');
    expect(t('auth.signIn')).toBe('Ngena');
    
    // Reset to English
    setLocale('en');
  });

  it('falls back to English for missing translations', () => {
    setLocale('af');
    expect(t('auth.signIn')).toBe('Teken In');
    
    // Reset to English
    setLocale('en');
  });

  it('formats dates correctly', () => {
    const testDate = new Date('2024-01-15T10:30:00Z');
    const formatted = formatDate(testDate, 'en');
    
    expect(formatted).toMatch(/2024/);
    expect(formatted).toMatch(/01/);
    expect(formatted).toMatch(/15/);
  });

  it('formats numbers correctly', () => {
    expect(formatNumber(1234.56, 'en')).toMatch(/1[,\s]234/);
  });

  it('formats currency correctly', () => {
    const formatted = formatCurrency(1234.56, 'en');
    expect(formatted).toMatch(/R/);
    expect(formatted).toMatch(/1[,\s]234/);
  });
});