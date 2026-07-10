import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../../../test/renderWithProviders';

const { mockUpdate } = vi.hoisted(() => ({ mockUpdate: vi.fn() }));

vi.mock('api/hooks/useCountries', () => ({
    useCountries: () => ({
        data: [
            { code: 'US', name: 'United States' },
            { code: 'FR', name: 'France' },
        ],
        isLoading: false,
    }),
}));

vi.mock('api/hooks/useMyPreferences', () => ({
    useUpdateMyPreferences: () => ({
        mutateAsync: mockUpdate,
        isPending: false,
    }),
}));

import StepCountry from './index';

const selectCountry = async (name: string) => {
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(
        within(screen.getByRole('listbox')).getByRole('option', { name })
    );
};

beforeEach(() => {
    mockUpdate.mockReset();
    mockUpdate.mockResolvedValue(undefined);
});

describe('Signup / StepCountry', () => {
    it('renders the country question and skippable controls', () => {
        renderWithProviders(
            <StepCountry onContinue={vi.fn()} onSkip={vi.fn()} />
        );
        expect(
            screen.getByRole('heading', { name: 'Where are you from?' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Continue' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Skip for now' })
        ).toBeInTheDocument();
    });

    it('skips (no save) when Continue is pressed with nothing selected', async () => {
        const onSkip = vi.fn();
        renderWithProviders(
            <StepCountry onContinue={vi.fn()} onSkip={onSkip} />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(onSkip).toHaveBeenCalledTimes(1);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('saves the selected country and advances', async () => {
        const onContinue = vi.fn();
        renderWithProviders(
            <StepCountry onContinue={onContinue} onSkip={vi.fn()} />
        );
        await selectCountry('France');
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        await waitFor(() =>
            expect(mockUpdate).toHaveBeenCalledWith({
                countryOfBirthCode: 'FR',
            })
        );
        expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('surfaces a save error', async () => {
        mockUpdate.mockRejectedValue(new Error('Save failed'));
        renderWithProviders(
            <StepCountry onContinue={vi.fn()} onSkip={vi.fn()} />
        );
        await selectCountry('France');
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Save failed'
        );
    });

    it('skips from the "Skip for now" link', async () => {
        const onSkip = vi.fn();
        renderWithProviders(
            <StepCountry onContinue={vi.fn()} onSkip={onSkip} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Skip for now' })
        );
        expect(onSkip).toHaveBeenCalledTimes(1);
    });
});
