import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import PlaceMetaLine from './index';

describe('PlaceMetaLine', () => {
    it('renders the country flag image and the meta children', () => {
        renderWithProviders(
            <PlaceMetaLine countryCode="JP" countryName="Japan">
                <span className="place-meta-seg">Kyoto · Japan</span>
            </PlaceMetaLine>
        );
        const flag = screen.getByRole('img', { name: 'Japan' });
        expect(flag).toHaveAttribute(
            'src',
            'https://flagcdn.com/w40/jp.png'
        );
        expect(screen.getByText('Kyoto · Japan')).toBeInTheDocument();
    });

    it('falls back to a globe icon when the country code is missing', () => {
        const { container } = renderWithProviders(
            <PlaceMetaLine countryName="Nowhere">
                <span>Somewhere</span>
            </PlaceMetaLine>
        );
        expect(container.querySelector('img')).toBeNull();
        expect(
            container.querySelector('.country-flag-fallback')
        ).not.toBeNull();
        expect(screen.getByText('Somewhere')).toBeInTheDocument();
    });
});
