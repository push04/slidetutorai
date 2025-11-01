export const darkTheme = {
  primary: '255 99 132',
  primaryForeground: '255 255 255',
  secondary: '129 140 248',
  secondaryForeground: '255 255 255',
  accent: '244 114 182',
  accentForeground: '255 255 255',
  background: '10 10 15',
  foreground: '241 245 249',
  card: '15 20 30',
  cardForeground: '241 245 249',
  muted: '30 41 59',
  mutedForeground: '148 163 184',
  border: '51 65 85',
  input: '51 65 85',
  ring: '129 140 248',
  success: '74 222 128',
  warning: '251 191 36',
  error: '248 113 113',
};

export function applyTheme(_theme: 'dark') {
  const root = document.documentElement;
  const colors = darkTheme;

  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  root.setAttribute('data-theme', 'dark');
}
