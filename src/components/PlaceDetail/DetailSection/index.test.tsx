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
