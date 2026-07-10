import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    within,
} from '../../../../test/renderWithProviders';

import StepAge from './index';

const setup = (over: Partial<React.ComponentProps<typeof StepAge>> = {}) => {
    const props = {
        birthYear: '' as number | '',
        confirmAge: false,
        onBirthYearChange: vi.fn(),
        onConfirmChange: vi.fn(),
        onSubmit: vi.fn(),
        submitting: false,
        ...over,
    };
    renderWithProviders(<StepAge {...props} />);
    return props;
};

describe('Signup / StepAge', () => {
    it('renders the birth-year question', () => {
        setup();
        expect(
            screen.getByRole('heading', { name: 'When were you born?' })
        ).toBeInTheDocument();
    });

    it('keeps Create account disabled until a year is picked and age is confirmed', () => {
        setup();
        expect(
            screen.getByRole('button', { name: 'Create account' })
        ).toBeDisabled();
    });

    it('enables and fires Create account when the form is valid', async () => {
        const props = setup({ birthYear: 2000, confirmAge: true });
        const cta = screen.getByRole('button', { name: 'Create account' });
        expect(cta).toBeEnabled();
        await userEvent.click(cta);
        expect(props.onSubmit).toHaveBeenCalledTimes(1);
    });

    it('shows the submitting label while the account is being created', () => {
        setup({ birthYear: 2000, confirmAge: true, submitting: true });
        expect(
            screen.getByRole('button', { name: 'Creating account…' })
        ).toBeDisabled();
    });

    it('reports the age-confirmation checkbox toggle', async () => {
        const props = setup();
        await userEvent.click(screen.getByRole('checkbox'));
        expect(props.onConfirmChange).toHaveBeenCalledWith(true);
    });

    it('reports the selected birth year', async () => {
        const props = setup();
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(
            within(screen.getByRole('listbox')).getByRole('option', {
                name: '2000',
            })
        );
        expect(props.onBirthYearChange).toHaveBeenCalledWith(2000);
    });
});
