import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../test/renderWithProviders';

const { mockMutate } = vi.hoisted(() => ({ mockMutate: vi.fn() }));

vi.mock('api/hooks/useAuth', () => ({
    useGoogleSignin: () => ({ mutate: mockMutate }),
}));

vi.mock('components/GoogleSignInButton', () => ({
    default: ({ onCredential }: { onCredential: (c: string) => void }) => (
        <button type="button" onClick={() => onCredential('fake-credential')}>
            Google
        </button>
    ),
}));

import LoginBtn from './index';

const submitButton = () =>
    screen
        .getAllByRole('button', { name: 'Login' })
        .find((btn) => btn.getAttribute('type') === 'submit') as HTMLElement;

describe('LoginBtn', () => {
    it('renders a Login trigger and no modal content initially', () => {
        renderWithProviders(<LoginBtn />);
        expect(
            screen.getByRole('button', { name: 'Login' })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Continue with email' })
        ).not.toBeInTheDocument();
    });

    it('opens the provider chooser when the trigger is clicked', async () => {
        renderWithProviders(<LoginBtn />);
        await userEvent.click(screen.getByRole('button', { name: 'Login' }));
        expect(
            screen.getByRole('button', { name: 'Continue with email' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Google' })
        ).toBeInTheDocument();
    });

    it('hides the sign-up link unless onSwitchToSignup is provided', async () => {
        renderWithProviders(<LoginBtn />);
        await userEvent.click(screen.getByRole('button', { name: 'Login' }));
        expect(
            screen.queryByRole('button', { name: 'Sign up' })
        ).not.toBeInTheDocument();
    });

    it('closes and calls onSwitchToSignup from the chooser link', async () => {
        const onSwitchToSignup = vi.fn();
        renderWithProviders(
            <LoginBtn onSwitchToSignup={onSwitchToSignup} />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Login' }));
        await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
        expect(onSwitchToSignup).toHaveBeenCalledTimes(1);
    });

    it('switches to the email form and back', async () => {
        renderWithProviders(<LoginBtn />);
        await userEvent.click(screen.getByRole('button', { name: 'Login' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Continue with email' })
        );
        expect(screen.getByLabelText('Username')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Forgot password?' })
        ).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(
            screen.getByRole('button', { name: 'Continue with email' })
        ).toBeInTheDocument();
    });

    it('submits the email form and closes on success', async () => {
        const onClick = vi.fn().mockResolvedValue(undefined);
        renderWithProviders(<LoginBtn onClick={onClick} />);
        await userEvent.click(screen.getByRole('button', { name: 'Login' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Continue with email' })
        );
        await userEvent.type(screen.getByLabelText('Username'), 'ada');
        await userEvent.type(screen.getByLabelText('Password'), 'secret');
        await userEvent.click(submitButton());

        expect(onClick).toHaveBeenCalledWith({
            username: 'ada',
            password: 'secret',
        });
        await waitFor(() =>
            expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
        );
    });

    it('surfaces the error and keeps the modal open on a rejected login', async () => {
        const onClick = vi.fn().mockRejectedValue(new Error('Invalid creds'));
        renderWithProviders(<LoginBtn onClick={onClick} />);
        await userEvent.click(screen.getByRole('button', { name: 'Login' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Continue with email' })
        );
        await userEvent.type(screen.getByLabelText('Username'), 'ada');
        await userEvent.type(screen.getByLabelText('Password'), 'secret');
        await userEvent.click(submitButton());

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Invalid creds');
        expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('forwards the Google credential to the sign-in mutation', async () => {
        renderWithProviders(<LoginBtn />);
        await userEvent.click(screen.getByRole('button', { name: 'Login' }));
        await userEvent.click(screen.getByRole('button', { name: 'Google' }));
        expect(mockMutate).toHaveBeenCalledWith(
            'fake-credential',
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            })
        );
    });

    it('closes the modal on a successful Google sign-in', async () => {
        mockMutate.mockImplementation((_cred, opts) => opts.onSuccess());
        renderWithProviders(<LoginBtn />);
        await userEvent.click(screen.getByRole('button', { name: 'Login' }));
        await userEvent.click(screen.getByRole('button', { name: 'Google' }));
        await waitFor(() =>
            expect(
                screen.queryByRole('button', { name: 'Continue with email' })
            ).not.toBeInTheDocument()
        );
    });

    it('surfaces an error when the Google sign-in fails', async () => {
        mockMutate.mockImplementation((_cred, opts) =>
            opts.onError(new Error('Google failed'))
        );
        renderWithProviders(<LoginBtn />);
        await userEvent.click(screen.getByRole('button', { name: 'Login' }));
        await userEvent.click(screen.getByRole('button', { name: 'Google' }));
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Google failed');
    });

    it('closes the modal from the forgot-password link', async () => {
        renderWithProviders(<LoginBtn />);
        await userEvent.click(screen.getByRole('button', { name: 'Login' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Continue with email' })
        );
        await userEvent.click(
            screen.getByRole('link', { name: 'Forgot password?' })
        );
        await waitFor(() =>
            expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
        );
    });

    it('offers the sign-up link inside the email form too', async () => {
        const onSwitchToSignup = vi.fn();
        renderWithProviders(<LoginBtn onSwitchToSignup={onSwitchToSignup} />);
        await userEvent.click(screen.getByRole('button', { name: 'Login' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Continue with email' })
        );
        await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
        expect(onSwitchToSignup).toHaveBeenCalledTimes(1);
    });
});
