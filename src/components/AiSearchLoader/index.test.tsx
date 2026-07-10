import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, act } from '../../test/renderWithProviders';
import AiSearchLoader from './index';

describe('AiSearchLoader', () => {
    it('renders a polite status region', () => {
        renderWithProviders(<AiSearchLoader />);
        const status = screen.getByRole('status');
        expect(status).toBeInTheDocument();
        expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('shows a generic headline when no query is given', () => {
        renderWithProviders(<AiSearchLoader />);
        expect(
            screen.getByRole('heading', { name: 'Searching' })
        ).toBeInTheDocument();
    });

    it('weaves a trimmed query into the headline', () => {
        renderWithProviders(<AiSearchLoader query="  Bali  " />);
        const heading = screen.getByRole('heading', { name: /Searching for/ });
        expect(heading).toHaveTextContent('Bali');
    });

    it('renders the reassurance subcopy', () => {
        renderWithProviders(<AiSearchLoader />);
        expect(screen.getByText(/Hold tight/)).toBeInTheDocument();
    });

    it('shows the first rotating step and advances on the interval', () => {
        vi.useFakeTimers();
        try {
            renderWithProviders(<AiSearchLoader />);
            expect(
                screen.getByText('Parsing your query…')
            ).toBeInTheDocument();
            act(() => {
                vi.advanceTimersByTime(1600);
            });
            expect(
                screen.getByText('Scanning destinations worldwide…')
            ).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });
});
