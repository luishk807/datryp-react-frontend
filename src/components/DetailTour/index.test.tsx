import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    renderWithProviders,
    screen,
    fireEvent,
    act,
} from '../../test/renderWithProviders';

// jsdom can't run react-joyride's real overlay/positioning, so stub it to a
// component that renders its `steps`/`run` observably and exposes `onEvent`.
let mockJoyrideProps: Record<string, unknown> | null = null;

vi.mock('react-joyride', () => ({
    EVENTS: { TOUR_END: 'tour:end' },
    STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Joyride: (props: any) => {
        mockJoyrideProps = props;
        if (!props.run) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fire = (data: any) => props.onEvent(data);
        return (
            <div data-testid="joyride" data-steps={props.steps.length}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {props.steps.map((s: any, i: number) => (
                    <div key={i}>{s.title}</div>
                ))}
                <button type="button" onClick={() => fire({ status: 'finished' })}>
                    joyride-finish
                </button>
                <button type="button" onClick={() => fire({ status: 'skipped' })}>
                    joyride-skip
                </button>
                <button type="button" onClick={() => fire({ type: 'tour:end' })}>
                    joyride-end
                </button>
                <button
                    type="button"
                    onClick={() => fire({ status: 'running', type: 'step:after' })}
                >
                    joyride-step
                </button>
            </div>
        );
    },
}));

import DetailTour, { DETAIL_TOUR_STORAGE_KEY } from './index';

beforeEach(() => {
    mockJoyrideProps = null;
    localStorage.clear();
});

describe('DetailTour', () => {
    it('does not run immediately on mount (waits for the paint delay)', () => {
        vi.useFakeTimers();
        try {
            renderWithProviders(<DetailTour kind="country" />);
            expect(screen.queryByTestId('joyride')).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('auto-runs after the delay with three steps when not completed', () => {
        vi.useFakeTimers();
        try {
            renderWithProviders(<DetailTour kind="country" />);
            act(() => {
                vi.advanceTimersByTime(600);
            });
            expect(screen.getByTestId('joyride')).toHaveAttribute(
                'data-steps',
                '3'
            );
            expect(screen.getByText('Welcome to the guide')).toBeInTheDocument();
            expect(screen.getByText('Start planning')).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });

    it('shows the place-specific CTA copy for kind="place"', () => {
        vi.useFakeTimers();
        try {
            renderWithProviders(<DetailTour kind="place" />);
            act(() => {
                vi.advanceTimersByTime(600);
            });
            expect(screen.getByText('Add it to a trip')).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });

    it('does not run when the completion flag is already set', () => {
        vi.useFakeTimers();
        try {
            localStorage.setItem(DETAIL_TOUR_STORAGE_KEY, '1');
            renderWithProviders(<DetailTour kind="city" />);
            act(() => {
                vi.advanceTimersByTime(2000);
            });
            expect(screen.queryByTestId('joyride')).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('persists completion and stops running on finish', () => {
        vi.useFakeTimers();
        try {
            renderWithProviders(<DetailTour kind="country" />);
            act(() => {
                vi.advanceTimersByTime(600);
            });
            fireEvent.click(screen.getByText('joyride-finish'));
            expect(localStorage.getItem(DETAIL_TOUR_STORAGE_KEY)).toBe('1');
            expect(screen.queryByTestId('joyride')).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('persists completion on skip and on the tour-end event', () => {
        vi.useFakeTimers();
        try {
            const { unmount } = renderWithProviders(<DetailTour kind="country" />);
            act(() => {
                vi.advanceTimersByTime(600);
            });
            fireEvent.click(screen.getByText('joyride-skip'));
            expect(localStorage.getItem(DETAIL_TOUR_STORAGE_KEY)).toBe('1');
            unmount();

            localStorage.clear();
            renderWithProviders(<DetailTour kind="city" />);
            act(() => {
                vi.advanceTimersByTime(600);
            });
            fireEvent.click(screen.getByText('joyride-end'));
            expect(localStorage.getItem(DETAIL_TOUR_STORAGE_KEY)).toBe('1');
        } finally {
            vi.useRealTimers();
        }
    });

    it('keeps running for non-terminal events', () => {
        vi.useFakeTimers();
        try {
            renderWithProviders(<DetailTour kind="country" />);
            act(() => {
                vi.advanceTimersByTime(600);
            });
            fireEvent.click(screen.getByText('joyride-step'));
            expect(localStorage.getItem(DETAIL_TOUR_STORAGE_KEY)).toBeNull();
            expect(screen.getByTestId('joyride')).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });
});
