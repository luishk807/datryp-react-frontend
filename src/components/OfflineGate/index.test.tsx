import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';

let mockIsOffline = false;
vi.mock('hooks/useIsOffline', () => ({
    useIsOffline: () => mockIsOffline,
}));

import OfflineGate from './index';

const child = <div>route body</div>;

beforeEach(() => {
    mockIsOffline = false;
});

describe('OfflineGate', () => {
    it('renders children with no banner while online', () => {
        render(<OfflineGate>{child}</OfflineGate>);
        expect(screen.getByText('route body')).toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('overlays a non-blocking banner while offline but keeps children mounted', () => {
        mockIsOffline = true;
        render(<OfflineGate>{child}</OfflineGate>);
        expect(screen.getByText('route body')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
        expect(
            screen.getByRole('button', { name: /dismiss offline notice/i })
        ).toBeInTheDocument();
    });

    it('hides the banner when dismissed', async () => {
        mockIsOffline = true;
        render(<OfflineGate>{child}</OfflineGate>);
        await userEvent.click(
            screen.getByRole('button', { name: /dismiss offline notice/i })
        );
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByText('route body')).toBeInTheDocument();
    });

    it('re-shows the banner on the next drop after reconnecting', async () => {
        mockIsOffline = true;
        const { rerender } = render(<OfflineGate>{child}</OfflineGate>);
        await userEvent.click(
            screen.getByRole('button', { name: /dismiss offline notice/i })
        );
        expect(screen.queryByRole('status')).not.toBeInTheDocument();

        // Connection returns — the effect clears the dismissal.
        mockIsOffline = false;
        rerender(<OfflineGate>{child}</OfflineGate>);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();

        // Next drop shows the banner again instead of staying dismissed.
        mockIsOffline = true;
        rerender(<OfflineGate>{child}</OfflineGate>);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });
});
