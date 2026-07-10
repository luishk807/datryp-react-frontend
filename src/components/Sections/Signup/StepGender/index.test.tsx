import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../../../test/renderWithProviders';

const { mockUpdate } = vi.hoisted(() => ({ mockUpdate: vi.fn() }));

vi.mock('api/hooks/useMyPreferences', () => ({
    useGendersCatalog: () => ({
        data: [
            { id: 'g1', name: 'Female' },
            { id: 'g2', name: 'Male' },
        ],
        isLoading: false,
    }),
    useUpdateMyPreferences: () => ({
        mutateAsync: mockUpdate,
        isPending: false,
    }),
}));

import StepGender from './index';

const selectGender = async (name: string) => {
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(
        within(screen.getByRole('listbox')).getByRole('option', { name })
    );
};

beforeEach(() => {
    mockUpdate.mockReset();
    mockUpdate.mockResolvedValue(undefined);
});

describe('Signup / StepGender', () => {
    it('renders the gender question and skippable controls', () => {
        renderWithProviders(
            <StepGender onContinue={vi.fn()} onSkip={vi.fn()} />
        );
        expect(
            screen.getByRole('heading', { name: 'A bit about you' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Skip for now' })
        ).toBeInTheDocument();
    });

    it('skips (no save) when Continue is pressed with nothing selected', async () => {
        const onSkip = vi.fn();
        renderWithProviders(
            <StepGender onContinue={vi.fn()} onSkip={onSkip} />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(onSkip).toHaveBeenCalledTimes(1);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('saves the selected gender and advances', async () => {
        const onContinue = vi.fn();
        renderWithProviders(
            <StepGender onContinue={onContinue} onSkip={vi.fn()} />
        );
        await selectGender('Female');
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        await waitFor(() =>
            expect(mockUpdate).toHaveBeenCalledWith({ genderId: 'g1' })
        );
        expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('surfaces a save error', async () => {
        mockUpdate.mockRejectedValue(new Error('Save failed'));
        renderWithProviders(
            <StepGender onContinue={vi.fn()} onSkip={vi.fn()} />
        );
        await selectGender('Female');
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Save failed'
        );
    });
});
