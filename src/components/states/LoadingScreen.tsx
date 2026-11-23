import { useTranslation } from 'react-i18next';

/**
 * Écran de chargement centralisé, utilisé comme fallback de Suspense
 * pendant le chargement des données.
 */
export function LoadingScreen() {
  const { t } = useTranslation('common');
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mb-4"></div>
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    </div>
  );
}
