import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MaintenanceBanner from './index';

beforeEach(() => {
    sessionStorage.clear();
});

describe('MaintenanceBanner', () => {
    it('renders a default message and a dismiss button in banner mode', () => {
        render(<MaintenanceBanner message={null} until={null} />);
        const banner = screen.getByRole('status');
        expect(
            within(banner).getByText(/performing some maintenance/i)
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /dismiss maintenance notice/i })
        ).toBeInTheDocument();
    });

    it('renders a custom message and an ETA when until is a valid date', () => {
        render(
            <MaintenanceBanner
                message="Quick database upgrade"
                until="2026-08-01T12:00:00Z"
            />
        );
        expect(screen.getByText('Quick database upgrade')).toBeInTheDocument();
        expect(screen.getByText(/Expected back by/i)).toBeInTheDocument();
    });

    it('omits the ETA when until is not a parseable date', () => {
        render(<MaintenanceBanner message={null} until="not-a-date" />);
        expect(screen.queryByText(/Expected back by/i)).not.toBeInTheDocument();
    });

    it('dismisses and hides itself when the close button is clicked', async () => {
        render(<MaintenanceBanner message={null} until="2026-08-01T12:00:00Z" />);
        await userEvent.click(
            screen.getByRole('button', { name: /dismiss maintenance notice/i })
        );
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('stays hidden on mount when already dismissed for this window', () => {
        sessionStorage.setItem('maint-banner-dismissed:2026-08-01T12:00:00Z', '1');
        render(<MaintenanceBanner message={null} until="2026-08-01T12:00:00Z" />);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('is a persistent, non-dismissible reminder when persistent is set', () => {
        // Even a prior dismissal for this window is ignored while persistent.
        sessionStorage.setItem('maint-banner-dismissed:none', '1');
        render(<MaintenanceBanner message={null} until={null} persistent />);
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('Maintenance live')).toBeInTheDocument();
        expect(screen.getByText(/exempt as an admin/i)).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /dismiss maintenance notice/i })
        ).not.toBeInTheDocument();
    });
});
