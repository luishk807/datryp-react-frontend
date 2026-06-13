import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from 'i18n';
import './index.scss';

export interface LanguageSwitcherProps {
    className?: string;
}

/** Short codes shown on the segmented control. The full names live in the
 *  translation files (`language.en` / `language.es`) for the aria-labels. */
const SHORT: Record<SupportedLanguage, string> = { en: 'EN', es: 'ES' };

/**
 * Compact EN | ES segmented switch. Flips the app language via i18next; the
 * detector's localStorage cache persists the choice across reloads. Rendered
 * in the Footer (anonymous + desktop) and the logged-in user menu.
 */
const LanguageSwitcher = ({ className }: LanguageSwitcherProps) => {
    const { i18n, t } = useTranslation();
    const active = (i18n.resolvedLanguage ||
        i18n.language ||
        'en') as SupportedLanguage;

    return (
        <div
            className={classnames('language-switcher', className)}
            role="group"
            aria-label={t('language.label')}
        >
            {SUPPORTED_LANGUAGES.map((lng) => (
                <button
                    key={lng}
                    type="button"
                    className={classnames('language-switcher-option', {
                        'is-active': active === lng,
                    })}
                    aria-pressed={active === lng}
                    aria-label={t(`language.${lng}`)}
                    onClick={() => {
                        if (active !== lng) void i18n.changeLanguage(lng);
                    }}
                >
                    {SHORT[lng]}
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
