import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../test/renderWithProviders';

import StepPassword from './index';

const setup = (over: Partial<React.ComponentProps<typeof StepPassword>> = {}) => {
    const props = {
        value: '',
        onChange: vi.fn(),
        onContinue: vi.fn(),
        ...over,
    };
    renderWithProviders(<StepPassword {...props} />);
    return props;
};

describe('Signup / StepPassword', () => {
    it('renders the password question as the input label', () => {
        setup();
        expect(
            screen.getByRole('heading', { name: 'Create a password' })
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText('Create a password')
        ).toBeInTheDocument();
    });

    it('disables Continue below the minimum length and hints how many are left', () => {
        setup({ value: 'abc' });
        expect(
            screen.getByRole('button', { name: 'Continue' })
        ).toBeDisabled();
        expect(screen.getByText('5 more to go…')).toBeInTheDocument();
    });

    it('enables Continue at 8+ characters and fires it', async () => {
        const props = setup({ value: 'supersecret' });
        const cta = screen.getByRole('button', { name: 'Continue' });
        expect(cta).toBeEnabled();
        await userEvent.click(cta);
        expect(props.onContinue).toHaveBeenCalledTimes(1);
    });

    it('continues on Enter only when long enough', async () => {
        const props = setup({ value: 'supersecret' });
        await userEvent.type(
            screen.getByLabelText('Create a password'),
            '{Enter}'
        );
        expect(props.onContinue).toHaveBeenCalledTimes(1);
    });

    it('toggles password visibility', async () => {
        setup({ value: 'supersecret' });
        const field = screen.getByLabelText('Create a password');
        expect(field).toHaveAttribute('type', 'password');
        await userEvent.click(
            screen.getByRole('button', { name: 'Show password' })
        );
        expect(field).toHaveAttribute('type', 'text');
        await userEvent.click(
            screen.getByRole('button', { name: 'Hide password' })
        );
        expect(field).toHaveAttribute('type', 'password');
    });
});
