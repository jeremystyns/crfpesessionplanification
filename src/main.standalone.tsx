import './standalone/fetchShim'; // doit passer avant i18n et les loaders
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import App from './App.tsx';
import './index.css';
import './lib/i18n';
import { migrateStorageKeys, KEYS } from './lib/workshopLocalStorage';

migrateStorageKeys();

createRoot(document.getElementById('root')!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey={KEYS.theme} disableTransitionOnChange>
    <App />
  </ThemeProvider>,
);
