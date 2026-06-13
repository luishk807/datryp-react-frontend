import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { FOOTER_QUICK_LINKS } from 'components/Footer';
import { useSmsEnabled } from 'api/hooks/useFeatures';
import LanguageSwitcher from 'components/common/LanguageSwitcher';
import './index.scss';

interface MenuFooterLinksProps {
    /** Navigate to the link's route AND close the menu/sheet it lives in. */
    onNavigate: (path: string) => void;
    className?: string;
}

/**
 * Compact secondary links (About / Pricing / Contact / Terms / Privacy) +
 * copyright, shown under a separator at the bottom of the user menu for
 * logged-in users. The standalone page Footer hides itself for them, so
 * these legal/marketing links live here instead.
 */
const MenuFooterLinks = ({ onNavigate, className }: MenuFooterLinksProps) => {
    const year = new Date().getFullYear();
    const { t } = useTranslation();
    const smsEnabled = useSmsEnabled();
    const links = FOOTER_QUICK_LINKS.filter(
        (link) => smsEnabled || link.href !== '/sms',
    );
    return (
        <div className={classnames('menu-footer-links', className)}>
            <nav className="menu-footer-links-nav" aria-label={t('nav.moreLinks')}>
                {links.map((link) => (
                    <button
                        key={link.href}
                        type="button"
                        className="menu-footer-links-item"
                        onClick={() => onNavigate(link.href)}
                    >
                        {t(link.labelKey)}
                    </button>
                ))}
            </nav>
            <div className="menu-footer-links-meta">
                <LanguageSwitcher className="menu-footer-links-lang" />
                <span className="menu-footer-links-copy">
                    &copy; {year} DaTryp.com
                </span>
            </div>
        </div>
    );
};

export default MenuFooterLinks;
