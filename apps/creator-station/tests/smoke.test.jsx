import { describe, it, expect } from 'vitest';

describe('Creator Station Smoke Tests', () => {
  it('should have React available', async () => {
    const React = await import('react');
    expect(React.version).toBeDefined();
  });

  it('should have react-router-dom available', async () => {
    const router = await import('react-router-dom');
    expect(router.BrowserRouter).toBeDefined();
    expect(router.Routes).toBeDefined();
    expect(router.Route).toBeDefined();
  });

  it('should have zustand available', async () => {
    const zustand = await import('zustand');
    expect(zustand.create).toBeDefined();
  });

  it('should be able to import App component', async () => {
    const { default: App } = await import('../src/App');
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });
});
