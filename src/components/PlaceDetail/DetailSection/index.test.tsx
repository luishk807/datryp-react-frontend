import { describe, it, expect } from 'vitest';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import DetailSection from './index';

describe('DetailSection', () => {
    it('renders the title heading and children', () => {
        renderWithProviders(
            <DetailSection title="Weather" icon={<InfoRoundedIcon />}>
                <p>Sunny all week</p>
            </DetailSection>
        );

        expect(
            screen.getByRole('heading', { name: 'Weather' })
        ).toBeInTheDocument();
        expect(screen.getByText('Sunny all week')).toBeInTheDocument();
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
