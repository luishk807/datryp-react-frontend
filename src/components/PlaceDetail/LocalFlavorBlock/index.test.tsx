import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { LocalFlavor } from 'types';
import LocalFlavorBlock, { LocalFlavorSkeleton } from './index';

const flavor = (over: Partial<LocalFlavor> = {}): LocalFlavor => ({
    funLevel: 3,
    nightlife: 'Lively izakaya alleys after dark.',
    famousLiquor: 'Sake, served warm or cold.',
    uniqueSouvenir: 'Hand-painted folding fans.',
    mustDoBeforeLeaving: [
        { name: 'Watch the sunrise', why: 'From the temple steps.' },
        { name: 'Eat street ramen', why: 'At the night market.' },
    ],
    ...over,
});

describe('LocalFlavorBlock', () => {
    it('renders the fun meter, level score, and labeled rows', () => {
        renderWithProviders(<LocalFlavorBlock flavor={flavor()} />);
        const meter = screen.getByRole('meter');
        expect(meter).toHaveAttribute('aria-valuenow', '3');
        expect(meter).toHaveAttribute('aria-valuemax', '5');
        expect(screen.getByText('Balanced')).toBeInTheDocument();
        expect(
            screen.getByText('Lively izakaya alleys after dark.')
        ).toBeInTheDocument();
        expect(screen.getByText('Sake, served warm or cold.')).toBeInTheDocument();
        expect(
            screen.getByText('Hand-painted folding fans.')
        ).toBeInTheDocument();
    });

    it('renders the must-do list with an accessible name', () => {
        renderWithProviders(<LocalFlavorBlock flavor={flavor()} />);
        expect(
            screen.getByRole('list', {
                name: /things you shouldn't leave without doing/i,
            })
        ).toBeInTheDocument();
        expect(screen.getByText('Watch the sunrise')).toBeInTheDocument();
    });

    it('clamps an out-of-range fun level up to 5', () => {
        renderWithProviders(<LocalFlavorBlock flavor={flavor({ funLevel: 9 })} />);
        expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '5');
    });

    it('clamps an out-of-range fun level up to a minimum of 1', () => {
        renderWithProviders(<LocalFlavorBlock flavor={flavor({ funLevel: 0 })} />);
        expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '1');
    });
});

describe('LocalFlavorSkeleton', () => {
    it('renders shimmer bars', () => {
        const { container } = renderWithProviders(<LocalFlavorSkeleton />);
        expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });
});
