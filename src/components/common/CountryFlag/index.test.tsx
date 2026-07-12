import { describe, it, expect } from 'vitest';
import {
    renderWithProviders,
    screen,
    fireEvent,
} from '../../../test/renderWithProviders';
import CountryFlag from './index';

describe('CountryFlag', () => {
    it('renders the flag image with the title as alt text', () => {
        renderWithProviders(<CountryFlag code="SV" title="El Salvador" />);
        const img = screen.getByRole('img', { name: 'El Salvador' });
        expect(img).toHaveAttribute(
            'src',
            'https://flagcdn.com/w40/sv.png'
        );
    });

    it('falls back to the uppercased code as alt when no title', () => {
        renderWithProviders(<CountryFlag code="us" />);
        expect(screen.getByRole('img', { name: 'US' })).toBeInTheDocument();
    });

    it('renders a globe icon (no <img>) for an invalid code', () => {
        const { container } = renderWithProviders(
            <CountryFlag code="USA" title="United States" />
        );
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders a globe icon when the code is missing', () => {
        const { container } = renderWithProviders(<CountryFlag code={null} />);
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('swaps to the globe fallback when the flag image errors', () => {
        const { container } = renderWithProviders(<CountryFlag code="SV" />);
        fireEvent.error(screen.getByRole('img'));
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders a decorative flag with empty alt + aria-hidden', () => {
        const { container } = renderWithProviders(
            <CountryFlag code="SV" title="El Salvador" decorative />
        );
        const img = container.querySelector('img');
        expect(img).toHaveAttribute('alt', '');
        expect(img).toHaveAttribute('aria-hidden', 'true');
        // Hidden from the a11y tree — no longer exposed as an image.
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        // Visual output (image + hover tooltip) unchanged.
        expect(img).toHaveAttribute('src', 'https://flagcdn.com/w40/sv.png');
        expect(img).toHaveAttribute('title', 'El Salvador');
    });

    it('hides the decorative fallback globe from the a11y tree', () => {
        const { container } = renderWithProviders(
            <CountryFlag code={null} title="Nowhere" decorative />
        );
        expect(container.querySelector('img')).toBeNull();
        expect(
            container.querySelector('.country-flag-fallback')
        ).toHaveAttribute('aria-hidden', 'true');
    });
});
