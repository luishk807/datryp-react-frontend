import { describe, it, expect } from 'vitest';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import DetailSection from './index';

describe('DetailSection', () => {
    it('renders the title as a level-2 heading with its children', () => {
        renderWithProviders(
            <DetailSection title="Weather" icon={<InfoRoundedIcon />}>
                <p>Sunny all week</p>
            </DetailSection>
        );

        expect(
            screen.getByRole('heading', { level: 2, name: 'Weather' })
        ).toBeInTheDocument();
        expect(screen.getByText('Sunny all week')).toBeInTheDocument();
    });

    it('exposes the section as a keyboard-focusable named region', () => {
        renderWithProviders(
            <DetailSection title="Currency" icon={<InfoRoundedIcon />}>
                <p>USD</p>
            </DetailSection>
        );

        // Landmark navigation: each widget is a region named by its title.
        const region = screen.getByRole('region', { name: 'Currency' });
        // Keyboard users can Tab straight to the section.
        expect(region).toHaveAttribute('tabindex', '0');
        // Name comes from the heading via aria-labelledby — no duplicated
        // aria-label on the region.
        const heading = screen.getByRole('heading', {
            level: 2,
            name: 'Currency',
        });
        expect(heading.id).toBeTruthy();
        expect(region).toHaveAttribute('aria-labelledby', heading.id);
        expect(region).not.toHaveAttribute('aria-label');
    });

    it('describes the region by its body so focus reads the content', () => {
        renderWithProviders(
            <DetailSection title="Safety" icon={<InfoRoundedIcon />}>
                <p>Level 2 · 68/100 · Exercise increased caution</p>
            </DetailSection>
        );

        const region = screen.getByRole('region', { name: 'Safety' });
        const describedBy = region.getAttribute('aria-describedby');
        // Points at the body, NOT the title — so a screen reader announces the
        // title (name) AND reads the section content (description) on focus.
        expect(describedBy).toBeTruthy();
        expect(describedBy).not.toBe(region.getAttribute('aria-labelledby'));

        const body = document.getElementById(describedBy as string);
        expect(body).not.toBeNull();
        expect(body).toHaveClass('detail-section-body');
        expect(body).toHaveTextContent('68/100');
        expect(body).toHaveTextContent('Exercise increased caution');

        // The computed accessible description is the flattened body text.
        expect(region).toHaveAccessibleDescription(/68\/100/);
    });

    it('drops aria-describedby when contentRead is "items"', () => {
        renderWithProviders(
            <DetailSection
                title="Hidden gems"
                icon={<InfoRoundedIcon />}
                contentRead="items"
            >
                <ul>
                    <li tabIndex={0} aria-label="The High Line. A park.">
                        The High Line
                    </li>
                </ul>
            </DetailSection>
        );

        const region = screen.getByRole('region', { name: 'Hidden gems' });
        // No describedby: the body's rows are individually focusable and voice
        // themselves, so the region announces only its title (no double read).
        expect(region).not.toHaveAttribute('aria-describedby');
        // The focusable row is still reachable with its own accessible name.
        expect(
            screen.getByRole('listitem', { name: 'The High Line. A park.' })
        ).toHaveAttribute('tabindex', '0');
    });

    it('appends the optional badge to the title', () => {
        renderWithProviders(
            <DetailSection
                title="Must-see"
                icon={<InfoRoundedIcon />}
                badge={<span>5</span>}
            >
                <ul />
            </DetailSection>
        );
        expect(
            screen.getByRole('heading', { name: /Must-see/ })
        ).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('applies an extra class name to the section wrapper', () => {
        const { container } = renderWithProviders(
            <DetailSection
                title="Apps"
                icon={<InfoRoundedIcon />}
                className="essential-apps-section"
            >
                <p>body</p>
            </DetailSection>
        );
        expect(
            container.querySelector('.detail-section.essential-apps-section')
        ).toBeInTheDocument();
    });
});
