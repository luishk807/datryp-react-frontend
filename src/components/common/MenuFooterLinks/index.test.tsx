import { describe, it, expect, vi, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    within,
} from '../../../test/renderWithProviders';

const { smsState } = vi.hoisted(() => ({ smsState: { enabled: false } }));

vi.mock('api/hooks/useFeatures', () => ({
    useSmsEnabled: () => smsState.enabled,
}));

import MenuFooterLinks from './index';

afterEach(() => {
    smsState.enabled = false;
});

describe('MenuFooterLinks', () => {
    it('renders the secondary links inside a labelled nav', () => {
        renderWithProviders(<MenuFooterLinks onNavigate={() => {}} />);
        const nav = screen.getByRole('navigation', { name: 'More links' });
        for (const label of ['About', 'Pricing', 'Contact', 'Terms', 'Privacy']) {
            expect(
                within(nav).getByRole('button', { name: label })
            ).toBeInTheDocument();
        }
    });

    it('hides the SMS link while SMS is disabled', () => {
        renderWithProviders(<MenuFooterLinks onNavigate={() => {}} />);
        expect(
            screen.queryByRole('button', { name: 'SMS' })
        ).not.toBeInTheDocument();
    });

    it('shows the SMS link when SMS is enabled', () => {
        smsState.enabled = true;
        renderWithProviders(<MenuFooterLinks onNavigate={() => {}} />);
        expect(
            screen.getByRole('button', { name: 'SMS' })
        ).toBeInTheDocument();
    });

    it('calls onNavigate with the link route when a link is clicked', async () => {
        const onNavigate = vi.fn();
        renderWithProviders(<MenuFooterLinks onNavigate={onNavigate} />);
        await userEvent.click(screen.getByRole('button', { name: 'About' }));
        expect(onNavigate).toHaveBeenCalledWith('/about');
    });

    it('renders the language switcher and copyright with the current year', () => {
        renderWithProviders(<MenuFooterLinks onNavigate={() => {}} />);
        expect(
            screen.getByRole('group', { name: 'Language' })
        ).toBeInTheDocument();
        const year = new Date().getFullYear();
        expect(
            screen.getByText(new RegExp(`${year} DaTryp\\.com`))
        ).toBeInTheDocument();
    });

    it('merges a custom className onto the wrapper', () => {
        const { container } = renderWithProviders(
            <MenuFooterLinks onNavigate={() => {}} className="account-menu-footer" />
        );
        expect(
            container.querySelector('.menu-footer-links.account-menu-footer')
        ).toBeTruthy();
    });
});
