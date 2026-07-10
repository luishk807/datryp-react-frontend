import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import { usePlaceImage } from 'api/hooks/usePlaceImage';
import PlaceThumb from './index';

vi.mock('api/hooks/usePlaceImage', () => ({
    usePlaceImage: vi.fn(() => ({ data: null })),
}));

const mockUsePlaceImage = vi.mocked(usePlaceImage);

describe('PlaceThumb', () => {
    beforeEach(() => {
        mockUsePlaceImage.mockReturnValue({ data: null } as ReturnType<
            typeof usePlaceImage
        >);
    });

    it('uses the provided imageUrl as-is', () => {
        renderWithProviders(
            <PlaceThumb name="Eiffel Tower" imageUrl="eiffel.jpg" alt="Eiffel Tower" />
        );
        const img = screen.getByRole('img', { name: 'Eiffel Tower' });
        expect(img).toHaveAttribute('src', 'eiffel.jpg');
    });

    it('falls back to the resolved image when no imageUrl is given', () => {
        mockUsePlaceImage.mockReturnValue({
            data: { imageUrl: 'resolved.jpg' },
        } as ReturnType<typeof usePlaceImage>);
        renderWithProviders(<PlaceThumb name="Bali" alt="Bali" />);
        expect(screen.getByRole('img', { name: 'Bali' })).toHaveAttribute(
            'src',
            'resolved.jpg'
        );
    });

    it('uses the NO_IMAGE placeholder when nothing resolves', () => {
        const { container } = renderWithProviders(<PlaceThumb name="Nowhere" />);
        const img = container.querySelector('img') as HTMLImageElement;
        expect(img.getAttribute('src')).toBe('./images/logo-gray.png');
    });

    it('renders a decorative (empty-alt) image by default', () => {
        const { container } = renderWithProviders(<PlaceThumb name="Nowhere" />);
        expect(container.querySelector('img')).toHaveAttribute('alt', '');
    });
});
