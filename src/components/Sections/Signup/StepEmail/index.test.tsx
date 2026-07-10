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

import StepEmail from './index';

const setup = (over: Partial<React.ComponentProps<typeof StepEmail>> = {}) => {
    const props = {
        value: '',
        onChange: vi.fn(),
        onContinue: vi.fn(),
        onGoogleCredential: vi.fn(),
        googlePending: false,
        ...over,
    };
    renderWithProviders(<StepEmail {...props} />);
    return props;
};

describe('Signup / StepEmail', () => {
    it('renders the email question as the input label', () => {
        setup();
        expect(
            screen.getByRole('heading', { name: "What's your email?" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: "What's your email?" })
        ).toBeInTheDocument();
    });

    it('disables Continue until a value is entered', () => {
        setup({ value: '' });
        expect(
            screen.getByRole('button', { name: 'Continue' })
        ).toBeDisabled();
    });

    it('enables Continue and fires it once a value is present', async () => {
        const props = setup({ value: 'ada@example.com' });
        const cta = screen.getByRole('button', { name: 'Continue' });
        expect(cta).toBeEnabled();
        await userEvent.click(cta);
        expect(props.onContinue).toHaveBeenCalledTimes(1);
    });

    it('reports typed input via onChange', async () => {
        const props = setup();
        await userEvent.type(
            screen.getByRole('textbox', { name: "What's your email?" }),
            'a'
        );
        expect(props.onChange).toHaveBeenCalledWith('a');
    });

    it('forwards a Google credential', async () => {
        const props = setup();
        await userEvent.click(screen.getByRole('button', { name: 'Google' }));
        expect(props.onGoogleCredential).toHaveBeenCalledWith('fake-cred');
    });
});
