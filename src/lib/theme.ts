export const darkTheme = {
  primary: '132 146 255',
  primaryForeground: '10 14 32',
  secondary: '72 227 205',
  secondaryForeground: '4 14 16',
  accent: '210 164 255',
  accentForeground: '18 12 36',
  background: '6 10 22',
  foreground: '230 236 248',
  card: '12 16 30',
  cardForeground: '230 236 248',
  muted: '20 28 46',
  mutedForeground: '151 168 196',
  border: '34 44 66',
  input: '34 44 66',
  ring: '132 146 255',
  success: '76 222 190',
  warning: '249 191 105',
  error: '242 118 150',
};

export const lightTheme = {
  primary: '70 88 255',
  primaryForeground: '255 255 255',
  secondary: '34 218 196',
  secondaryForeground: '7 32 29',
  accent: '114 92 255',
  accentForeground: '245 242 255',
  background: '244 247 255',
  foreground: '15 23 42',
  card: '255 255 255',
  cardForeground: '15 23 42',
  muted: '230 236 250',
  mutedForeground: '94 112 142',
  border: '213 224 244',
  input: '213 224 244',
  ring: '70 88 255',
  success: '28 190 150',
  warning: '245 176 80',
  error: '232 72 108',
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
