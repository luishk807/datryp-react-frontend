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
];

/**
 * Single minimal-inline footer used on every route — full-bleed pages
 * included. Previously this component shipped two variants (full +
 * compact); they were consolidated when the full variant adopted the
 * same one-line shape the compact variant always had. There's no
 * `compact` prop anymore — every caller renders the same footer.
 */
const Footer = () => {
    const { user } = useUser();
    const year = new Date().getFullYear();
    // The footer always renders on DESKTOP — there's no bottom nav there, so a
    // real page footer is expected and shouldn't be buried in the account
    // menu. On mobile, logged-in users get these links in their account sheet
    // instead (the bottom nav already crowds the bottom), so the standalone
    // footer is hidden for them at small widths via `.footer--authed` CSS.
    return (
        <footer
            className={classNames('footer', {
                'footer--authed': Boolean(user),
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
