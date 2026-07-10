import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../../test/renderWithProviders';

const { mockUpdate } = vi.hoisted(() => ({ mockUpdate: vi.fn() }));

vi.mock('api/hooks/useMyPreferences', () => ({
    useInterestsCatalog: () => ({
        data: [{ slug: 'food', label: 'Food' }],
        isLoading: false,
    }),
    useTravelerStylesCatalog: () => ({
        data: [{ slug: 'luxury', label: 'Luxury' }],
        isLoading: false,
    }),
    useUpdateMyPreferences: () => ({
        mutateAsync: mockUpdate,
        isPending: false,
    }),
}));

vi.mock('api/hooks/useCountries', () => ({
    useCountries: () => ({
        data: [{ code: 'JP', name: 'Japan' }],
        isLoading: false,
    }),
}));

import StepInterests from './index';

beforeEach(() => {
    mockUpdate.mockReset();
    mockUpdate.mockResolvedValue(undefined);
});

describe('Signup / StepInterests', () => {
    it('renders the three preference pickers', () => {
        renderWithProviders(
            <StepInterests onContinue={vi.fn()} onSkip={vi.fn()} />
        );
        expect(
            screen.getByRole('heading', {
                name: 'Tell us about your travel style',
            })
        ).toBeInTheDocument();
        expect(screen.getByText('Interests')).toBeInTheDocument();
        expect(
            screen.getByText('What kind of traveler are you?')
        ).toBeInTheDocument();
        expect(
            screen.getByText("Places you'd like to visit")
        ).toBeInTheDocument();
    });

    it('skips (no save) when nothing is selected', async () => {
        const onSkip = vi.fn();
        renderWithProviders(
            <StepInterests onContinue={vi.fn()} onSkip={onSkip} />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(onSkip).toHaveBeenCalledTimes(1);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('saves the picked selections and advances', async () => {
        const onContinue = vi.fn();
        renderWithProviders(
            <StepInterests onContinue={onContinue} onSkip={vi.fn()} />
        );
        await userEvent.click(screen.getByRole('option', { name: 'Food' }));
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        await waitFor(() =>
            expect(mockUpdate).toHaveBeenCalledWith({
                interests: ['food'],
                travelerStyles: [],
                dreamDestinations: [],
            })
        );
        expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('surfaces a save error', async () => {
        mockUpdate.mockRejectedValue(new Error('Save failed'));
        renderWithProviders(
            <StepInterests onContinue={vi.fn()} onSkip={vi.fn()} />
        );
        await userEvent.click(screen.getByRole('option', { name: 'Food' }));
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Save failed'
        );
    });
});
