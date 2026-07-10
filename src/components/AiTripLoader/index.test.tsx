import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, act } from '../../test/renderWithProviders';
import AiTripLoader from './index';

describe('AiTripLoader', () => {
    it('renders nothing when closed', () => {
        renderWithProviders(<AiTripLoader open={false} />);
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('renders a polite status overlay with the build defaults when open', () => {
        renderWithProviders(<AiTripLoader open />);
        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');
        expect(
            screen.getByRole('heading', { name: 'Crafting your trip' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('Reading your bucket-list goal…')
        ).toBeInTheDocument();
    });

    it('uses the options-phase title + first status', () => {
        renderWithProviders(<AiTripLoader open phase="options" />);
        expect(
            screen.getByRole('heading', {
                name: 'Finding your destination matches',
            })
        ).toBeInTheDocument();
        expect(
            screen.getByText('Analyzing your budget and interests…')
        ).toBeInTheDocument();
    });

    it('uses the enrich-phase title + first status', () => {
        renderWithProviders(<AiTripLoader open phase="enrich" />);
        expect(
            screen.getByRole('heading', { name: 'Polishing your bucket list' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('Reading your saved goals…')
        ).toBeInTheDocument();
    });

    it('honors title + subtitle overrides', () => {
        renderWithProviders(
            <AiTripLoader open title="Custom title" subtitle="Custom sub" />
        );
        expect(
            screen.getByRole('heading', { name: 'Custom title' })
        ).toBeInTheDocument();
        expect(screen.getByText('Custom sub')).toBeInTheDocument();
    });

    it('rotates the status message on the interval', () => {
        vi.useFakeTimers();
        try {
            renderWithProviders(<AiTripLoader open />);
            expect(
                screen.getByText('Reading your bucket-list goal…')
            ).toBeInTheDocument();
            act(() => {
                vi.advanceTimersByTime(1800);
            });
            expect(
                screen.getByText('Picking the right destination…')
            ).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });
});
