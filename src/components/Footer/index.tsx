import './index.scss';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import { useUser } from 'context/UserContext';

export interface QuickLink {
    label: string;
    href: string;
    /** When true, render via react-router `<Link>` (internal); otherwise `<a>`. */
    internal?: boolean;
}

/** Secondary site links. Shared with the user menu (MenuFooterLinks) —
 *  logged-in users get these inside their account menu rather than a
 *  standalone footer (the Footer hides itself for them). */
export const FOOTER_QUICK_LINKS: QuickLink[] = [
    { label: 'About', href: '/about', internal: true },
    { label: 'Pricing', href: '/membership', internal: true },
    { label: 'Contact', href: '/contact', internal: true },
    { label: 'Terms', href: '/terms', internal: true },
    { label: 'Privacy', href: '/privacy', internal: true },
    { label: 'SMS', href: '/sms', internal: true },
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
    const year = new Date().getFullYear();
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
                    {FOOTER_QUICK_LINKS.map((link) =>
                        link.internal ? (
                            <Link key={link.label} to={link.href}>
                                {link.label}
                            </Link>
                        ) : (
                            <a key={link.label} href={link.href}>
                                {link.label}
                            </a>
                        ),
                    )}
                </nav>
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
