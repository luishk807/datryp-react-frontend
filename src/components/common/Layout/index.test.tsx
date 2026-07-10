import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import Layout from './index';

// Header/Footer pull in useUser, SearchBar and a stack of data hooks that
// aren't the subject here — stub them so the shell is tested in isolation.
vi.mock('components/Header', () => ({
    default: () => <header data-testid="app-header" />,
}));
vi.mock('components/Footer', () => ({
    default: () => <footer data-testid="app-footer" />,
}));

describe('Layout', () => {
    it('renders its children', () => {
        renderWithProviders(
            <Layout>
                <p>Page body</p>
            </Layout>
        );
        expect(screen.getByText('Page body')).toBeInTheDocument();
    });

    it('exposes a <main> landmark for the page content', () => {
        renderWithProviders(<Layout>content</Layout>);
        const main = screen.getByRole('main');
        expect(main).toHaveAttribute('id', 'main-content');
    });

    it('renders a skip link that targets the main content', () => {
        renderWithProviders(<Layout>content</Layout>);
        const skip = screen.getByRole('link', { name: /skip to main content/i });
        expect(skip).toHaveAttribute('href', '#main-content');
    });

    it('renders the header and footer chrome', () => {
        renderWithProviders(<Layout>content</Layout>);
        expect(screen.getByTestId('app-header')).toBeInTheDocument();
        expect(screen.getByTestId('app-footer')).toBeInTheDocument();
    });
});
