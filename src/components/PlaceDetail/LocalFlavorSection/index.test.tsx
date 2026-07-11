import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { LocalFlavor } from 'types';
import LocalFlavorSection from './index';

const flavor: LocalFlavor = {
    funLevel: 4,
    nightlife: 'Rooftop bars with skyline views.',
    famousLiquor: 'Local craft gin.',
    uniqueSouvenir: 'Ceramic tiles.',
    mustDoBeforeLeaving: [{ name: 'Ride the tram', why: 'Best city views.' }],
};

describe('LocalFlavorSection', () => {
    it('renders nothing when the source query errored', () => {
        const { container } = renderWithProviders(
            <LocalFlavorSection flavor={flavor} isError />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows a skeleton inside the section while loading', () => {
        const { container } = renderWithProviders(
            <LocalFlavorSection flavor={undefined} />
        );
        expect(
            screen.getByRole('heading', { name: /local flavor/i })
        ).toBeInTheDocument();
        expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });

    it('renders the flavor block once resolved', () => {
        renderWithProviders(<LocalFlavorSection flavor={flavor} />);
        expect(
            screen.getByRole('heading', { name: /local flavor/i })
        ).toBeInTheDocument();
        expect(
            screen.getByText('Rooftop bars with skyline views.')
        ).toBeInTheDocument();
        expect(screen.getByRole('meter')).toBeInTheDocument();
    });
});
