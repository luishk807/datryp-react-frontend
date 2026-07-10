import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../test/renderWithProviders';

vi.mock('components/GoogleSignInButton', () => ({
    default: ({ onCredential }: { onCredential: (c: string) => void }) => (
        <button type="button" onClick={() => onCredential('fake-cred')}>
            Google
        </button>
    ),
}));

import StepName from './index';

const setup = (over: Partial<React.ComponentProps<typeof StepName>> = {}) => {
    const props = {
        value: '',
        onChange: vi.fn(),
        onContinue: vi.fn(),
        onGoogleCredential: vi.fn(),
        googlePending: false,
        ...over,
    };
    renderWithProviders(<StepName {...props} />);
    return props;
};

describe('Signup / StepName', () => {
    it('renders the question as the accessible name of the input', () => {
        setup();
        expect(
            screen.getByRole('heading', { name: 'What should we call you?' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'What should we call you?' })
        ).toBeInTheDocument();
    });

    it('reports typed input via onChange', async () => {
        const props = setup();
        await userEvent.type(
            screen.getByRole('textbox', { name: 'What should we call you?' }),
            'x'
        );
        expect(props.onChange).toHaveBeenCalledWith('x');
    });

    it('continues on Enter and on the Continue button', async () => {
        const props = setup();
        await userEvent.type(
            screen.getByRole('textbox', { name: 'What should we call you?' }),
            '{Enter}'
        );
        expect(props.onContinue).toHaveBeenCalledTimes(1);

        await userEvent.click(
            screen.getByRole('button', { name: 'Continue' })
        );
        expect(props.onContinue).toHaveBeenCalledTimes(2);
    });

    it('forwards a Google credential', async () => {
        const props = setup();
        await userEvent.click(screen.getByRole('button', { name: 'Google' }));
        expect(props.onGoogleCredential).toHaveBeenCalledWith('fake-cred');
    });

    it('shows a pending hint while Google sign-in resolves', () => {
        setup({ googlePending: true });
        expect(screen.getByText('Signing you in…')).toBeInTheDocument();
    });
});
