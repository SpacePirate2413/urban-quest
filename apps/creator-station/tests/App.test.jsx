import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Creator Station App', () => {
  describe('App Bootstrap', () => {
    it('should be able to import App component', async () => {
      const { default: App } = await import('../src/App');
      expect(App).toBeDefined();
      expect(typeof App).toBe('function');
    });

    it('should render App without crashing', async () => {
      const { default: App } = await import('../src/App');
      const { container } = render(<App />);
      expect(container).toBeDefined();
    });
  });

  describe('Components', () => {
    it('should be able to import TopBar', async () => {
      const layout = await import('../src/components/layout');
      expect(layout.TopBar).toBeDefined();
    });

    it('should be able to import pages', async () => {
      const write = await import('../src/pages/write');
      expect(write.WriterDashboard).toBeDefined();
    });
  });
});
