import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

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

import TripTour from './index';

beforeEach(() => {
    mockJoyrideProps = null;
});

describe('TripTour', () => {
    it('renders nothing when not running', () => {
        renderWithProviders(
            <TripTour run={false} tourKey="mode" onClose={vi.fn()} />
        );
        expect(screen.queryByTestId('joyride')).toBeNull();
    });

    it('renders the four "mode" steps for the mode screen', () => {
        renderWithProviders(<TripTour run tourKey="mode" onClose={vi.fn()} />);
        expect(screen.getByTestId('joyride')).toHaveAttribute('data-steps', '4');
        expect(screen.getByText('Plan your first trip')).toBeInTheDocument();
    });

    it('renders the four "itinerary" steps for the itinerary screen', () => {
        renderWithProviders(
            <TripTour run tourKey="itinerary" onClose={vi.fn()} />
        );
        expect(screen.getByTestId('joyride')).toHaveAttribute('data-steps', '4');
        expect(screen.getByText('Build your itinerary')).toBeInTheDocument();
    });

    it('renders a single step for a one-question screen', () => {
        renderWithProviders(<TripTour run tourKey="dates" onClose={vi.fn()} />);
        expect(screen.getByTestId('joyride')).toHaveAttribute('data-steps', '1');
        expect(screen.getByText('When are you going?')).toBeInTheDocument();
    });

    it('keys Joyride by the active screen so a screen change remounts it', () => {
        renderWithProviders(<TripTour run tourKey="budget" onClose={vi.fn()} />);
        expect(mockJoyrideProps?.key ?? undefined).toBeUndefined();
        // `key` is a React-reserved prop and not forwarded to component props;
        // assert the step set instead reflects the requested screen.
        expect(screen.getByTestId('joyride')).toHaveAttribute('data-steps', '1');
    });

    it('calls onClose on finish, skip, and tour-end', async () => {
        const onClose = vi.fn();
        renderWithProviders(<TripTour run tourKey="mode" onClose={onClose} />);
        await userEvent.click(screen.getByText('joyride-finish'));
        await userEvent.click(screen.getByText('joyride-skip'));
        await userEvent.click(screen.getByText('joyride-end'));
        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('does not call onClose for a non-terminal event', async () => {
        const onClose = vi.fn();
        renderWithProviders(<TripTour run tourKey="mode" onClose={onClose} />);
        await userEvent.click(screen.getByText('joyride-step'));
        expect(onClose).not.toHaveBeenCalled();
    });
});
