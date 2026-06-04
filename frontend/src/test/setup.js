// Vitest setup file. Loaded before each test file.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-clean React Testing Library's DOM between tests so a stuck node from
// one test does not bleed into the next.
afterEach(() => {
  cleanup();
});

// Provide a deterministic localStorage mock for tokenStorage code that runs
// at module-load time (e.g. authStore reads token on import). jsdom already
// ships a working localStorage, so we just make sure it starts empty.
if (typeof window !== 'undefined' && window.localStorage) {
  window.localStorage.clear();
}

// Stub out fetch so any code path that accidentally hits the network during
// a test fails loudly instead of hanging or trying to reach localhost.
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = async () => {
    throw new Error('fetch was called in a test that did not mock it.');
  };
}
