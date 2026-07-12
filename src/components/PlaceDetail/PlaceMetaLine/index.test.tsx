import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import PlaceMetaLine from './index';

describe('PlaceMetaLine', () => {
    it('renders the country flag as decorative (name already in the meta text)', () => {
        const { container } = renderWithProviders(
            <PlaceMetaLine countryCode="JP" countryName="Japan">
                <span className="place-meta-seg">Kyoto · Japan</span>
            </PlaceMetaLine>
        );
        const flag = container.querySelector('.country-flag');
        expect(flag).toHaveAttribute('src', 'https://flagcdn.com/w40/jp.png');
        // The country name is already in the meta text, so the flag is hidden
        // from the a11y tree to avoid double-announcing "Japan".
        expect(flag).toHaveAttribute('alt', '');
        expect(flag).toHaveAttribute('aria-hidden', 'true');
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
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
