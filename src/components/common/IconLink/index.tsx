import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import './index.css';

export interface IconLinkProps {
    /** Route to navigate to. */
    to: string;
    /**
     * Optional link text. If omitted, the link is icon-only (e.g. a brand logo).
     * Provide `ariaLabel` for accessibility in that case.
     */
    label?: string;
    /**
     * Optional adornment shown alongside the label. Anything React can render:
     * a string ("←"), an MUI icon (<ArrowBackIcon />), an <img />, etc.
     */
    icon?: ReactNode;
    /** Where the icon sits relative to the label. Defaults to 'leading'. */
    iconPosition?: 'leading' | 'trailing';
    /** Extra class for theme overrides (e.g. white-on-dark hero panels). */
    className?: string;
    /** Accessible label when there's no visible `label` text. */
    ariaLabel?: string;
}

const IconLink = ({
    to,
    label,
    icon,
    iconPosition = 'leading',
    className,
    ariaLabel,
}: IconLinkProps) => {
    const adornment = icon ? (
        <span aria-hidden={Boolean(label)} className="icon-link-adornment">
            {icon}
        </span>
    ) : null;

    return (
        <Link
            to={to}
            className={classNames('icon-link', className)}
            aria-label={!label && ariaLabel ? ariaLabel : undefined}
        >
            {iconPosition === 'leading' && adornment}
            {label && <span className="icon-link-label">{label}</span>}
            {iconPosition === 'trailing' && adornment}
        </Link>
    );
};

export default IconLink;
