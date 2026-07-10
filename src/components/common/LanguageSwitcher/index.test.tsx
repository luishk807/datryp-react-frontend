import { describe, it, expect, afterEach } from 'vitest';
import i18n from 'i18n';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../test/renderWithProviders';
import LanguageSwitcher from './index';

afterEach(async () => {
    // Reset the shared i18next instance so language changes don't leak.
    await i18n.changeLanguage('en');
});

describe('LanguageSwitcher', () => {
    it('renders a labelled group with EN + ES options', () => {
        renderWithProviders(<LanguageSwitcher />);
        expect(screen.getByRole('group')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /english/i })).toHaveTextContent(
            'EN'
        );
        expect(screen.getByRole('button', { name: /español/i })).toHaveTextContent(
            'ES'
        );
    });

    it('marks the active language with aria-pressed', () => {
        renderWithProviders(<LanguageSwitcher />);
        expect(
            screen.getByRole('button', { name: /english/i })
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('button', { name: /español/i })
        ).toHaveAttribute('aria-pressed', 'false');
    });

    it('switches the active language when a different option is clicked', async () => {
        renderWithProviders(<LanguageSwitcher />);
        await userEvent.click(
            screen.getByRole('button', { name: /español/i })
        );
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: /español/i })
            ).toHaveAttribute('aria-pressed', 'true')
        );
    });
});
