import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

// Confetti pulls in a dotLottie/canvas runtime; keep it inert.
vi.mock('components/Confetti', () => ({ default: () => null }));

import Complete from './index';

beforeEach(() => {
    mockNavigate.mockReset();
});

describe('Complete', () => {
    it('renders the celebration heading, subtitle, and image', () => {
        renderWithProviders(<Complete />);
        expect(
            screen.getByRole('heading', { name: 'Your trip is all set!' })
        ).toBeInTheDocument();
        expect(
            screen.getByText("Pack your bags — we've saved every detail.")
        ).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: 'Trip complete' })
        ).toBeInTheDocument();
    });

    it('navigates to /trips from the primary "View Your Trip" button', async () => {
        renderWithProviders(<Complete />);
        await userEvent.click(
            screen.getByRole('button', { name: 'View Your Trip' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/trips');
    });

    it('without onReset, the secondary button reads "Return Home" and navigates home', async () => {
        renderWithProviders(<Complete />);
        const secondary = screen.getByRole('button', { name: 'Return Home' });
        await userEvent.click(secondary);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('with onReset, the secondary button reads "Plan Another" and calls onReset instead of navigating', async () => {
        const onReset = vi.fn();
        renderWithProviders(<Complete onReset={onReset} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Plan Another' })
        );
        expect(onReset).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
