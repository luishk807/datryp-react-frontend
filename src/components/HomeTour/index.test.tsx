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

import HomeTour from './index';

beforeEach(() => {
    mockJoyrideProps = null;
});

describe('HomeTour', () => {
    it('renders nothing when run is false', () => {
        renderWithProviders(<HomeTour run={false} onClose={vi.fn()} />);
        expect(screen.queryByTestId('joyride')).toBeNull();
    });

    it('renders its five steps when run', () => {
        renderWithProviders(<HomeTour run onClose={vi.fn()} />);
        expect(screen.getByTestId('joyride')).toHaveAttribute('data-steps', '5');
        expect(screen.getByText('Three ways to start')).toBeInTheDocument();
        expect(screen.getByText('Let us plan it for you')).toBeInTheDocument();
    });

    it('forwards continuous + localized skip label to Joyride', () => {
        renderWithProviders(<HomeTour run onClose={vi.fn()} />);
        expect(mockJoyrideProps?.continuous).toBe(true);
        expect(
            (mockJoyrideProps?.locale as Record<string, string>).skip
        ).toBe('Skip tour');
    });

    it('calls onClose on finish', async () => {
        const onClose = vi.fn();
        renderWithProviders(<HomeTour run onClose={onClose} />);
        await userEvent.click(screen.getByText('joyride-finish'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose on skip and on the tour-end event', async () => {
        const onClose = vi.fn();
        renderWithProviders(<HomeTour run onClose={onClose} />);
        await userEvent.click(screen.getByText('joyride-skip'));
        await userEvent.click(screen.getByText('joyride-end'));
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('does not call onClose for a non-terminal event', async () => {
        const onClose = vi.fn();
        renderWithProviders(<HomeTour run onClose={onClose} />);
        await userEvent.click(screen.getByText('joyride-step'));
        expect(onClose).not.toHaveBeenCalled();
    });
});
