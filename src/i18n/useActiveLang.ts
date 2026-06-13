import { useTranslation } from 'react-i18next';
import { activeLang, type SupportedLanguage } from 'i18n';

/**
 * Reactive active content language ('en' | 'es'). Subscribes to i18next so a
 * language switch re-renders the consumer — used in React Query keys for the
 * dynamic-content detail hooks so EN/ES responses cache separately and a switch
 * triggers a refetch. The matching `?lang=` on the request is read from the same
 * `activeLang()` by the API wrappers.
 */
export const useActiveLang = (): SupportedLanguage => {
    // Called for its subscription side effect — re-renders on `languageChanged`.
    useTranslation();
    return activeLang();
};
