import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import IconLink from './index';

describe('IconLink', () => {
    it('renders a link with visible label text and the target href', () => {
        renderWithProviders(<IconLink to="/trips" label="My Trips" />);
        const link = screen.getByRole('link', { name: 'My Trips' });
        expect(link).toHaveAttribute('href', '/trips');
    });

    it('falls back to ariaLabel when icon-only (no visible label)', () => {
        renderWithProviders(
            <IconLink to="/" icon={<span>logo</span>} ariaLabel="Home" />
        );
        const link = screen.getByRole('link', { name: 'Home' });
        expect(link).toHaveAttribute('href', '/');
    });

    it('treats the icon as decorative when a text label is present', () => {
        renderWithProviders(
            <IconLink
                to="/back"
                label="Back"
                icon={<span data-testid="chevron">‹</span>}
            />
        );
        // Icon is aria-hidden alongside a label, so the accessible name is
        // just the label (not "‹ Back").
        const link = screen.getByRole('link', { name: 'Back' });
        expect(link).toHaveAttribute('href', '/back');
        expect(screen.getByTestId('chevron')).toBeInTheDocument();
    });

    it('supports a trailing icon position', () => {
        renderWithProviders(
            <IconLink
                to="/next"
                label="Next"
                icon={<span>→</span>}
                iconPosition="trailing"
            />
        );
        expect(
            screen.getByRole('link', { name: 'Next' })
        ).toHaveAttribute('href', '/next');
    });
});
