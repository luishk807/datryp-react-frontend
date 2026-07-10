import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../test/renderWithProviders';

const {
    mockNavigate,
    mockSignup,
    mockGoogle,
    mockUpdatePrefs,
} = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockSignup: vi.fn(),
    mockGoogle: vi.fn(),
    mockUpdatePrefs: vi.fn(),
}));

let mockUser: { onboardingCompletedAt?: string | null } | null = null;

vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

vi.mock('api/hooks/useAuth', () => ({
    useSignup: () => ({ mutateAsync: mockSignup, isPending: false }),
    useGoogleSignin: () => ({ mutate: mockGoogle, isPending: false }),
}));

vi.mock('api/hooks/useMyPreferences', () => ({
    useUpdateMyPreferences: () => ({
        mutateAsync: mockUpdatePrefs,
        isPending: false,
    }),
}));

vi.mock('api/hooks/useMonthlyTopCities', () => ({
    useMonthlyTopCities: () => ({ data: { cities: [] } }),
}));

// Stub each step to a minimal control surface that fires the parent callbacks
// so the shell's step machine + submit/onboarding logic is driven in isolation.
vi.mock('./StepName', () => ({
    default: ({
        onChange,
        onContinue,
        onGoogleCredential,
    }: {
        onChange: (v: string) => void;
        onContinue: () => void;
        onGoogleCredential: (c: string) => void;
    }) => (
        <div>
            <p>step-name</p>
            <button onClick={() => onChange('Ada')}>name-set</button>
            <button onClick={onContinue}>name-continue</button>
            <button onClick={() => onGoogleCredential('cred')}>name-google</button>
        </div>
    ),
}));
vi.mock('./StepEmail', () => ({
    default: ({
        onChange,
        onContinue,
    }: {
        onChange: (v: string) => void;
        onContinue: () => void;
    }) => (
        <div>
            <p>step-email</p>
            <button onClick={() => onChange('ada@example.com')}>email-set</button>
            <button onClick={onContinue}>email-continue</button>
        </div>
    ),
}));
vi.mock('./StepPassword', () => ({
    default: ({
        onChange,
        onContinue,
    }: {
        onChange: (v: string) => void;
        onContinue: () => void;
    }) => (
        <div>
            <p>step-password</p>
            <button onClick={() => onChange('supersecret')}>password-set</button>
            <button onClick={onContinue}>password-continue</button>
        </div>
    ),
}));
vi.mock('./StepAge', () => ({
    default: ({
        onBirthYearChange,
        onConfirmChange,
        onSubmit,
    }: {
        onBirthYearChange: (v: number) => void;
        onConfirmChange: (v: boolean) => void;
        onSubmit: () => void;
    }) => (
        <div>
            <p>step-age</p>
            <button onClick={() => onBirthYearChange(2000)}>age-set</button>
            <button onClick={() => onConfirmChange(true)}>age-confirm</button>
            <button onClick={onSubmit}>age-submit</button>
        </div>
    ),
}));
vi.mock('./StepCountry', () => ({
    default: ({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) => (
        <div>
            <p>step-country</p>
            <button onClick={onContinue}>country-continue</button>
            <button onClick={onSkip}>country-skip</button>
        </div>
    ),
}));
vi.mock('./StepGender', () => ({
    default: () => <p>step-gender</p>,
}));
vi.mock('./StepInterests', () => ({
    default: () => <p>step-interests</p>,
}));
vi.mock('./StepFavorites', () => ({
    default: () => <p>step-favorites</p>,
}));
vi.mock('./StepBucketList', () => ({
    default: ({ onFinish, onSkip }: { onFinish: () => void; onSkip: () => void }) => (
        <div>
            <p>step-bucket</p>
            <button onClick={onFinish}>bucket-finish</button>
            <button onClick={onSkip}>bucket-skip</button>
        </div>
    ),
}));

import Signup from './index';

const progress = () => screen.getByRole('progressbar');

beforeEach(() => {
    mockNavigate.mockReset();
    mockSignup.mockReset();
    mockGoogle.mockReset();
    mockUpdatePrefs.mockReset();
    mockUpdatePrefs.mockResolvedValue(undefined);
    mockUser = null;
});

describe('Signup', () => {
    it('starts on step 1 (name) with the progress bar at step 1', () => {
        renderWithProviders(<Signup />);
        expect(screen.getByText('step-name')).toBeInTheDocument();
        expect(progress()).toHaveAttribute('aria-valuenow', '1');
        expect(
            screen.getByRole('link', { name: 'Sign in' })
        ).toBeInTheDocument();
    });

    it('advances to the next step on Continue and can go back', async () => {
        renderWithProviders(<Signup />);
        await userEvent.click(
            screen.getByRole('button', { name: 'name-continue' })
        );
        expect(screen.getByText('step-email')).toBeInTheDocument();
        expect(progress()).toHaveAttribute('aria-valuenow', '2');

        await userEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(screen.getByText('step-name')).toBeInTheDocument();
        expect(progress()).toHaveAttribute('aria-valuenow', '1');
    });

    it('jumps a Google sign-in straight to onboarding (step 5)', async () => {
        mockGoogle.mockImplementation((_cred, opts) => opts.onSuccess());
        renderWithProviders(<Signup />);
        await userEvent.click(
            screen.getByRole('button', { name: 'name-google' })
        );
        expect(mockGoogle).toHaveBeenCalledWith('cred', expect.any(Object));
        expect(screen.getByText('step-country')).toBeInTheDocument();
        expect(progress()).toHaveAttribute('aria-valuenow', '5');
    });

    it('surfaces a Google sign-in error', async () => {
        mockGoogle.mockImplementation((_cred, opts) =>
            opts.onError(new Error('Google failed'))
        );
        renderWithProviders(<Signup />);
        await userEvent.click(
            screen.getByRole('button', { name: 'name-google' })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Google failed'
        );
    });

    // Full multi-step flows fire many sequential userEvent clicks; give them
    // headroom so they don't trip the 5s default under heavy parallel load.
    it('blocks account creation when email/password are missing', async () => {
        renderWithProviders(<Signup />);
        await userEvent.click(screen.getByRole('button', { name: 'name-continue' }));
        await userEvent.click(screen.getByRole('button', { name: 'email-continue' }));
        await userEvent.click(screen.getByRole('button', { name: 'password-continue' }));
        await userEvent.click(screen.getByRole('button', { name: 'age-set' }));
        await userEvent.click(screen.getByRole('button', { name: 'age-confirm' }));
        await userEvent.click(screen.getByRole('button', { name: 'age-submit' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Email and password are required.'
        );
        expect(mockSignup).not.toHaveBeenCalled();
    }, 20000);

    it('creates the account with the collected draft and advances to onboarding', async () => {
        mockSignup.mockResolvedValue(undefined);
        renderWithProviders(<Signup />);
        await userEvent.click(screen.getByRole('button', { name: 'name-set' }));
        await userEvent.click(screen.getByRole('button', { name: 'name-continue' }));
        await userEvent.click(screen.getByRole('button', { name: 'email-set' }));
        await userEvent.click(screen.getByRole('button', { name: 'email-continue' }));
        await userEvent.click(screen.getByRole('button', { name: 'password-set' }));
        await userEvent.click(screen.getByRole('button', { name: 'password-continue' }));
        await userEvent.click(screen.getByRole('button', { name: 'age-set' }));
        await userEvent.click(screen.getByRole('button', { name: 'age-confirm' }));
        await userEvent.click(screen.getByRole('button', { name: 'age-submit' }));

        await waitFor(() =>
            expect(mockSignup).toHaveBeenCalledWith({
                email: 'ada@example.com',
                password: 'supersecret',
                birth_year: 2000,
                confirm_age_13_plus: true,
                name: 'Ada',
            })
        );
        expect(await screen.findByText('step-country')).toBeInTheDocument();
    }, 20000);

    it('keeps the user on the age step and shows the error on signup failure', async () => {
        mockSignup.mockRejectedValue(new Error('Email already registered'));
        renderWithProviders(<Signup />);
        await userEvent.click(screen.getByRole('button', { name: 'name-continue' }));
        await userEvent.click(screen.getByRole('button', { name: 'email-set' }));
        await userEvent.click(screen.getByRole('button', { name: 'email-continue' }));
        await userEvent.click(screen.getByRole('button', { name: 'password-set' }));
        await userEvent.click(screen.getByRole('button', { name: 'password-continue' }));
        await userEvent.click(screen.getByRole('button', { name: 'age-set' }));
        await userEvent.click(screen.getByRole('button', { name: 'age-confirm' }));
        await userEvent.click(screen.getByRole('button', { name: 'age-submit' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Email already registered'
        );
        expect(screen.getByText('step-age')).toBeInTheDocument();
    }, 20000);

    it('finishes onboarding from "Skip the rest" — marks complete and exits home', async () => {
        mockGoogle.mockImplementation((_cred, opts) => opts.onSuccess());
        renderWithProviders(<Signup />);
        await userEvent.click(screen.getByRole('button', { name: 'name-google' }));
        // Now on the onboarding portion; the shell offers "Skip the rest".
        await userEvent.click(
            screen.getByRole('button', { name: 'Skip the rest' })
        );
        await waitFor(() =>
            expect(mockUpdatePrefs).toHaveBeenCalledWith({ markComplete: true })
        );
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
        );
    });

    it('redirects an already-onboarded user home instead of showing the funnel', async () => {
        mockUser = { onboardingCompletedAt: '2026-01-01T00:00:00Z' };
        renderWithProviders(<Signup />);
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
        );
    });
});
