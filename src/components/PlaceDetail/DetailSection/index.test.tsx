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

    it('is a named region (landmark) but NOT a keyboard tab stop', () => {
        renderWithProviders(
            <DetailSection title="Currency" icon={<InfoRoundedIcon />}>
                <p>USD</p>
            </DetailSection>
        );

        // Named via the heading, so screen-reader users jump here by landmark /
        // heading navigation and read the body with browse-mode commands.
        const region = screen.getByRole('region', { name: 'Currency' });
        const heading = screen.getByRole('heading', {
            level: 2,
            name: 'Currency',
        });
        expect(heading.id).toBeTruthy();
        expect(region).toHaveAttribute('aria-labelledby', heading.id);
        expect(region).not.toHaveAttribute('aria-label');
        // Informational card: Tab must skip it — Tab belongs to real controls.
        expect(region).not.toHaveAttribute('tabindex');
        // No aria-describedby — the content is in the reading order, not a
        // (Narrator-unreliable) description.
        expect(region).not.toHaveAttribute('aria-describedby');
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
