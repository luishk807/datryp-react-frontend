import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

vi.mock('@lottiefiles/dotlottie-react', () => ({
    setWasmUrl: vi.fn(),
    DotLottieReact: ({ className }: { className?: string }) => (
        <div data-testid="dotlottie-mock" className={className} />
    ),
}));

vi.mock(
    '@lottiefiles/dotlottie-web/dotlottie-player.wasm?url',
    () => ({ default: 'test-wasm-url' })
);

import PageLoader from './index';

describe('PageLoader', () => {
    it('renders a polite status region named "Loading"', () => {
        renderWithProviders(<PageLoader />);
        const status = screen.getByRole('status', { name: 'Loading' });
        expect(status).toBeInTheDocument();
        expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('renders the branded animation', () => {
        renderWithProviders(<PageLoader />);
        expect(screen.getByTestId('dotlottie-mock')).toBeInTheDocument();
    });

    it('renders no caption by default', () => {
        const { container } = renderWithProviders(<PageLoader />);
        expect(container.querySelector('.page-loader-label')).toBeNull();
    });

    it('renders the label caption when provided', () => {
        renderWithProviders(<PageLoader label="Fetching your trips" />);
        expect(screen.getByText('Fetching your trips')).toBeInTheDocument();
    });
});
