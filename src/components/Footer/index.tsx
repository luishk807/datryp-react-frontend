import './index.scss';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import { useUser } from 'context/UserContext';
import { useSmsEnabled } from 'api/hooks/useFeatures';
import LanguageSwitcher from 'components/common/LanguageSwitcher';

export interface QuickLink {
    /** i18n key for the link text (e.g. `footer.about`). */
    labelKey: string;
    href: string;
    /** When true, render via react-router `<Link>` (internal); otherwise `<a>`. */
    internal?: boolean;
}

/** Secondary site links. Shared with the user menu (MenuFooterLinks) —
 *  logged-in users get these inside their account menu rather than a
 *  standalone footer (the Footer hides itself for them). */
export const FOOTER_QUICK_LINKS: QuickLink[] = [
    { labelKey: 'footer.about', href: '/about', internal: true },
    { labelKey: 'footer.pricing', href: '/membership', internal: true },
    { labelKey: 'footer.contact', href: '/contact', internal: true },
    { labelKey: 'footer.terms', href: '/terms', internal: true },
    { labelKey: 'footer.privacy', href: '/privacy', internal: true },
    { labelKey: 'footer.sms', href: '/sms', internal: true },
];

interface FooterProps {
    /** When true the footer stays visible on mobile, pinned to the bottom
     *  of its container. Used only by the auth/login splash — every other
     *  page hides its footer on mobile (the bottom nav replaces it). */
    showOnMobile?: boolean;
}

/**
 * Single minimal-inline footer used on every route — full-bleed pages
 * included. Previously this component shipped two variants (full +
 * compact); they were consolidated when the full variant adopted the
 * same one-line shape the compact variant always had. There's no
 * `compact` prop anymore — every caller renders the same footer.
 */
const Footer = ({ showOnMobile = false }: FooterProps) => {
    const { user } = useUser();
    const { t } = useTranslation();
    const smsEnabled = useSmsEnabled();
    const year = new Date().getFullYear();
    // Drop the SMS Messaging Policy link while the SMS feature is off — it only
    // documents a feature users can't reach.
    const quickLinks = FOOTER_QUICK_LINKS.filter(
        (link) => smsEnabled || link.href !== '/sms',
    );
    // The footer always renders on DESKTOP — there's no bottom nav there, so a
    // real page footer is expected. On mobile the bottom nav replaces it, so
    // the standalone page footer is hidden below the desktop breakpoint (see
    // `.footer` CSS). The auth/login splash opts back in via `showOnMobile`
    // (`.footer--login`) since it has no bottom-nav-crowding page chrome of
    // its own and shows the footer pinned above the bottom nav.
    return (
        <footer
            className={classNames('footer', {
                'footer--authed': Boolean(user),
                'footer--login': showOnMobile,
            })}
        >
            <div className="footer-inner">
                <span className="footer-brand">DaTryp</span>
                <nav className="footer-nav" aria-label="Footer">
                    {quickLinks.map((link) =>
                        link.internal ? (
                            <Link key={link.href} to={link.href}>
                                {t(link.labelKey)}
                            </Link>
                        ) : (
                            <a key={link.href} href={link.href}>
                                {t(link.labelKey)}
                            </a>
                        ),
                    )}
                </nav>
                <LanguageSwitcher className="footer-lang" />
                <div className="footer-social" aria-label="Social links">
                    <a href="#" aria-label="Instagram">
                        <InstagramIcon fontSize="small" />
                    </a>
                    <a href="#" aria-label="Facebook">
                        <FacebookIcon fontSize="small" />
                    </a>
                    <a href="#" aria-label="Twitter">
                        <TwitterIcon fontSize="small" />
                    </a>
                </div>
                <span className="footer-copy">
                    &copy; {year} DaTryp.com
                </span>
            </div>
        </footer>
    );
};

export default Footer;
