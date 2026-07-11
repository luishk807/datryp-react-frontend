import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import WalkabilitySection from './index';

describe('WalkabilitySection', () => {
    it('renders nothing when walkability is missing', () => {
        const { container } = renderWithProviders(
            <WalkabilitySection walkability={undefined} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the rating is below 1', () => {
        const { container } = renderWithProviders(
            <WalkabilitySection walkability={{ rating: 0, note: 'n/a' }} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the star rating and note', () => {
        const { container } = renderWithProviders(
            <WalkabilitySection
                walkability={{ rating: 4, note: 'Flat and pedestrian-friendly' }}
            />
        );
        expect(
            screen.getByRole('heading', { name: /walkability/i })
        ).toBeInTheDocument();
        expect(
            container.querySelector('[aria-label="4 out of 5"]')
        ).toBeInTheDocument();
        expect(
            screen.getByText('Flat and pedestrian-friendly')
        ).toBeInTheDocument();
    });

    it('clamps and rounds the rating, and omits the note when empty', () => {
        const { container } = renderWithProviders(
            <WalkabilitySection walkability={{ rating: 6.7, note: '' }} />
        );
        // 6.7 → clamped to 5.
        expect(
            container.querySelector('[aria-label="5 out of 5"]')
        ).toBeInTheDocument();
        expect(
            container.querySelector('.walkability-note')
        ).not.toBeInTheDocument();
    });
});
