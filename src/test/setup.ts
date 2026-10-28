import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { setCurrentLocale } from '../shared/i18n/locale';

afterEach(() => {
  cleanup();
  localStorage.clear();
  setCurrentLocale('es');
});
