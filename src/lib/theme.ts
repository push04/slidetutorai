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

export const lightTheme = {
  primary: '255 99 132',
  primaryForeground: '255 255 255',
  secondary: '99 102 241',
  secondaryForeground: '255 255 255',
  accent: '236 72 153',
  accentForeground: '255 255 255',
  background: '255 255 255',
  foreground: '15 23 42',
  card: '248 250 252',
  cardForeground: '15 23 42',
  muted: '241 245 249',
  mutedForeground: '100 116 139',
  border: '226 232 240',
  input: '226 232 240',
  ring: '99 102 241',
  success: '34 197 94',
  warning: '234 179 8',
  error: '239 68 68',
};

export function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  const colors = theme === 'dark' ? darkTheme : lightTheme;

  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  root.setAttribute('data-theme', theme);
  
  // Update document class for Tailwind dark mode
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
