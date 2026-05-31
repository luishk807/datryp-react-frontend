import classnames from 'classnames';
import { FOOTER_QUICK_LINKS } from 'components/Footer';
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
    return (
        <div className={classnames('menu-footer-links', className)}>
            <nav className="menu-footer-links-nav" aria-label="More links">
                {FOOTER_QUICK_LINKS.map((link) => (
                    <button
                        key={link.label}
                        type="button"
                        className="menu-footer-links-item"
                        onClick={() => onNavigate(link.href)}
                    >
                        {link.label}
                    </button>
                ))}
            </nav>
            <span className="menu-footer-links-copy">
                &copy; {year} DaTryp.com
            </span>
        </div>
    );
};

export default MenuFooterLinks;
