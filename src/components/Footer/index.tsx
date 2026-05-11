import './index.css';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';

const QUICK_LINKS = [
    { label: 'About Us', href: '#' },
    { label: 'Contact Us', href: '#' },
    { label: 'Terms of Use', href: '#' },
    { label: 'Privacy Policy', href: '#' },
];

const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-top">
                    <div className="footer-brand">
                        <img
                            src="/images/logoWhite.svg"
                            alt="daTryp"
                            className="footer-logo"
                        />
                        <p className="footer-tagline">
                            Plan trips that feel effortless.
                        </p>
                    </div>

                    <div className="footer-links">
                        <h4 className="footer-heading">Quick links</h4>
                        <ul>
                            {QUICK_LINKS.map((link) => (
                                <li key={link.label}>
                                    <a href={link.href}>{link.label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="footer-social">
                        <h4 className="footer-heading">Connect</h4>
                        <div className="footer-social-icons">
                            <a href="#" aria-label="Instagram">
                                <InstagramIcon />
                            </a>
                            <a href="#" aria-label="Facebook">
                                <FacebookIcon />
                            </a>
                            <a href="#" aria-label="Twitter">
                                <TwitterIcon />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <span className="footer-copy">
                        © {year} daTryp. All rights reserved.
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
