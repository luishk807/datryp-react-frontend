import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import SkipLink from './index';

describe('SkipLink', () => {
    it('renders a link that targets the main-content landmark', () => {
        renderWithProviders(<SkipLink />);
        const link = screen.getByRole('link', {
            name: 'Skip to main content',
        });
        expect(link).toHaveAttribute('href', '#main-content');
    });
});
