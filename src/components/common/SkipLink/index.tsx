import { useTranslation } from 'react-i18next';
import './index.scss';

/** WCAG 2.4.1 "Bypass Blocks" — a visually-hidden link, revealed on
 *  keyboard focus, that jumps past the header/nav straight to the page's
 *  `<main id="main-content">`. Render it as the first focusable child of a
 *  layout shell so it's the very first Tab stop. */
const SkipLink = () => {
    const { t } = useTranslation();
    return (
        <a href="#main-content" className="skip-link">
            {t('common.skipToContent')}
        </a>
    );
};

export default SkipLink;
