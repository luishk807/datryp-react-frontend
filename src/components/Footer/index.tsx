import "./index.scss";
import { Link } from "react-router-dom";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";

interface QuickLink {
  label: string;
  href: string;
  /** When true, render via react-router `<Link>` (internal); otherwise `<a>`. */
  internal?: boolean;
}

const QUICK_LINKS: QuickLink[] = [
  { label: "About Us", href: "/about", internal: true },
  { label: "Pricing", href: "/membership", internal: true },
  { label: "Contact Us", href: "/contact", internal: true },
  { label: "Terms of Use", href: "/terms", internal: true },
  { label: "Privacy Policy", href: "/privacy", internal: true },
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
            <p className="footer-tagline">Plan trips that feel effortless.</p>
          </div>

          <div className="footer-links">
            <h4 className="footer-heading">Quick links</h4>
            <ul>
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  {link.internal ? (
                    <Link to={link.href}>{link.label}</Link>
                  ) : (
                    <a href={link.href}>{link.label}</a>
                  )}
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
            &copy; {year} daTryp. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
