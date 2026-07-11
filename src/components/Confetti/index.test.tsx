import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

// react-confetti draws to a <canvas>, which jsdom doesn't implement — stub it
// to a prop-recording placeholder so we can assert what the wrapper passes.
const mockConfetti: { props: Record<string, unknown> | null } = { props: null };

vi.mock('react-use/lib/useWindowSize', () => ({
    default: () => ({ width: 1024, height: 768 }),
}));

vi.mock('react-confetti', () => ({
    default: (props: Record<string, unknown>) => {
        mockConfetti.props = props;
        return (
            <div
                data-testid="confetti"
                data-pieces={String(props.numberOfPieces)}
                data-recycle={String(props.recycle)}
            />
        );
    },
}));

import ConfettiComp from './index';

beforeEach(() => {
    mockConfetti.props = null;
});

describe('Confetti', () => {
    it('renders no pieces when inactive (the default)', () => {
        renderWithProviders(<ConfettiComp />);
        const el = screen.getByTestId('confetti');
        expect(el).toHaveAttribute('data-pieces', '0');
        expect(el).toHaveAttribute('data-recycle', 'false');
    });

    it('fires a burst of pieces when activated', () => {
        renderWithProviders(<ConfettiComp activate />);
        expect(screen.getByTestId('confetti')).toHaveAttribute(
            'data-pieces',
            '500'
        );
    });

    it('passes the recycle flag through', () => {
        renderWithProviders(<ConfettiComp activate recycle />);
        expect(screen.getByTestId('confetti')).toHaveAttribute(
            'data-recycle',
            'true'
        );
    });

    it('resets the confetti instance on completion', () => {
        renderWithProviders(<ConfettiComp activate />);
        const reset = vi.fn();
        const onComplete = mockConfetti.props?.onConfettiComplete as (
            c: { reset: () => void }
        ) => void;
        onComplete({ reset });
        expect(reset).toHaveBeenCalledTimes(1);
    });
});
