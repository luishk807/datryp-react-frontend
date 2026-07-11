import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/renderWithProviders';
import { NO_IMAGE } from 'constants';
import ImageBlock from './index';

describe('ImageBlock', () => {
    it('renders the provided image with its name as alt text', () => {
        render(
            <ImageBlock image={{ url: 'https://img/eiffel.jpg', name: 'Eiffel Tower' }} />
        );
        const img = screen.getByRole('img', { name: 'Eiffel Tower' });
        expect(img).toHaveAttribute('src', 'https://img/eiffel.jpg');
    });

    it('falls back to the decorative placeholder when no image is given', () => {
        const { container } = render(<ImageBlock />);
        // Empty alt keeps the placeholder out of the a11y tree (decorative).
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        const placeholder = container.querySelector('.in-no-image img');
        expect(placeholder).toHaveAttribute('src', NO_IMAGE);
        expect(placeholder).toHaveAttribute('alt', '');
    });

    it('treats an explicit null image as no image', () => {
        const { container } = render(<ImageBlock image={null} />);
        expect(container.querySelector('.in-no-image')).toBeInTheDocument();
    });
});
