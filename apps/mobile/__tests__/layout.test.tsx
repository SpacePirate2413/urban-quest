import RootLayout, { unstable_settings } from '../app/_layout';

describe('Mobile App Layout', () => {
  it('should be able to import RootLayout', () => {
    expect(RootLayout).toBeDefined();
    expect(typeof RootLayout).toBe('function');
  });

  it('should export unstable_settings', () => {
    expect(unstable_settings).toBeDefined();
    expect(unstable_settings.anchor).toBe('(tabs)');
  });
});
