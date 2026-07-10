import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../../test/renderWithProviders';
import type { MonthlyTopCity } from 'types';

const { mockSave, mockUnsave } = vi.hoisted(() => ({
    mockSave: vi.fn(),
    mockUnsave: vi.fn(),
}));

vi.mock('api/hooks/useSavedCities', () => ({
    useSaveCity: () => ({ mutateAsync: mockSave }),
    useUnsaveCity: () => ({ mutateAsync: mockUnsave }),
}));

import StepFavorites from './index';

const LISBON = {
    name: 'Lisbon',
    country: 'Portugal',
    countryCode: 'PT',
    imageUrl: 'http://img',
} as MonthlyTopCity;

beforeEach(() => {
    mockSave.mockReset();
    mockSave.mockResolvedValue(undefined);
    mockUnsave.mockReset();
    mockUnsave.mockResolvedValue(undefined);
});

describe('Signup / StepFavorites', () => {
    it('shows a loading hint when no cities are available yet', () => {
        renderWithProviders(
            <StepFavorites cities={[]} onContinue={vi.fn()} onSkip={vi.fn()} />
        );
        expect(screen.getByText('Loading suggestions…')).toBeInTheDocument();
    });

    it('renders a toggleable card per city and saves on tap', async () => {
        renderWithProviders(
            <StepFavorites
                cities={[LISBON]}
                onContinue={vi.fn()}
                onSkip={vi.fn()}
            />
        );
        const card = screen.getByRole('button', { name: /Lisbon/ });
        expect(card).toHaveAttribute('aria-pressed', 'false');
        await userEvent.click(card);
        expect(card).toHaveAttribute('aria-pressed', 'true');
        await waitFor(() =>
            expect(mockSave).toHaveBeenCalledWith({
                name: 'Lisbon',
                country: 'Portugal',
                code: 'PT',
                imageUrl: 'http://img',
            })
        );
    });

    it('reverts the toggle and shows an error when the save fails', async () => {
        mockSave.mockRejectedValue(new Error('Nope'));
        renderWithProviders(
            <StepFavorites
                cities={[LISBON]}
                onContinue={vi.fn()}
                onSkip={vi.fn()}
            />
        );
        const card = screen.getByRole('button', { name: /Lisbon/ });
        await userEvent.click(card);
        expect(await screen.findByRole('alert')).toHaveTextContent('Nope');
        expect(card).toHaveAttribute('aria-pressed', 'false');
    });

    it('continues and skips via the footer controls', async () => {
        const onContinue = vi.fn();
        const onSkip = vi.fn();
        renderWithProviders(
            <StepFavorites
                cities={[LISBON]}
                onContinue={onContinue}
                onSkip={onSkip}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(onContinue).toHaveBeenCalledTimes(1);
        await userEvent.click(
            screen.getByRole('button', { name: 'Skip for now' })
        );
        expect(onSkip).toHaveBeenCalledTimes(1);
    });
});
