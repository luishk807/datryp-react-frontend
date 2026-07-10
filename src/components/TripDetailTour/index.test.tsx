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

import TripDetailTour from './index';

beforeEach(() => {
    mockJoyrideProps = null;
});

describe('TripDetailTour', () => {
    it('renders nothing when not running', () => {
        renderWithProviders(<TripDetailTour run={false} onClose={vi.fn()} />);
        expect(screen.queryByTestId('joyride')).toBeNull();
    });

    it('renders all eleven steps when run', () => {
        renderWithProviders(<TripDetailTour run onClose={vi.fn()} />);
        expect(screen.getByTestId('joyride')).toHaveAttribute(
            'data-steps',
            '11'
        );
        expect(screen.getByText('Your trip is saved')).toBeInTheDocument();
        expect(screen.getByText('Per-activity status')).toBeInTheDocument();
    });

    it('calls onClose on finish, skip, and tour-end', async () => {
        const onClose = vi.fn();
        renderWithProviders(<TripDetailTour run onClose={onClose} />);
        await userEvent.click(screen.getByText('joyride-finish'));
        await userEvent.click(screen.getByText('joyride-skip'));
        await userEvent.click(screen.getByText('joyride-end'));
        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('does not call onClose for a non-terminal event', async () => {
        const onClose = vi.fn();
        renderWithProviders(<TripDetailTour run onClose={onClose} />);
        await userEvent.click(screen.getByText('joyride-step'));
        expect(onClose).not.toHaveBeenCalled();
    });
});
