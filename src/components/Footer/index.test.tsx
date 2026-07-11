import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, within } from '../../test/renderWithProviders';

let mockUser: unknown = null;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

let mockSmsEnabled = false;
vi.mock('api/hooks/useFeatures', () => ({
    useSmsEnabled: () => mockSmsEnabled,
}));

vi.mock('components/common/LanguageSwitcher', () => ({
    default: () => <div data-testid="lang-switcher" />,
}));

import Footer from './index';

beforeEach(() => {
    mockUser = null;
    mockSmsEnabled = false;
});

describe('Footer', () => {
    it('renders a contentinfo landmark with a labelled nav and quick links', () => {
        renderWithProviders(<Footer />);
        const footer = screen.getByRole('contentinfo');
        const nav = within(footer).getByRole('navigation', { name: 'Footer' });
        expect(
            within(nav).getByRole('link', { name: 'About' })
        ).toHaveAttribute('href', '/about');
        expect(
            within(nav).getByRole('link', { name: 'Pricing' })
        ).toHaveAttribute('href', '/membership');
        expect(
            within(nav).getByRole('link', { name: 'Contact' })
        ).toBeInTheDocument();
        expect(
            within(nav).getByRole('link', { name: 'Terms' })
        ).toBeInTheDocument();
        expect(
            within(nav).getByRole('link', { name: 'Privacy' })
        ).toBeInTheDocument();
    });

    it('hides the SMS policy link while SMS is disabled', () => {
        renderWithProviders(<Footer />);
        expect(
            screen.queryByRole('link', { name: 'SMS' })
        ).not.toBeInTheDocument();
    });

    it('shows the SMS policy link once SMS is enabled', () => {
        mockSmsEnabled = true;
        renderWithProviders(<Footer />);
        expect(
            screen.getByRole('link', { name: 'SMS' })
        ).toHaveAttribute('href', '/sms');
    });

    it('renders the current-year copyright', () => {
        renderWithProviders(<Footer />);
        const year = new Date().getFullYear();
        expect(
            screen.getByText(new RegExp(`${year} DaTryp\\.com`))
        ).toBeInTheDocument();
    });

    it('marks the footer as authed when a user is signed in', () => {
        mockUser = { id: 'u1', name: 'Ada' };
        renderWithProviders(<Footer />);
        expect(screen.getByRole('contentinfo')).toHaveClass('footer--authed');
    });
});
