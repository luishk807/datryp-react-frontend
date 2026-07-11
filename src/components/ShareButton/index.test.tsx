import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../test/renderWithProviders';

// EmailShareModal is a heavy ref-driven child; stub it to a no-op that just
// records `open()` calls so we can assert the Email channel wires through.
const { mockEmailOpen } = vi.hoisted(() => ({ mockEmailOpen: vi.fn() }));
vi.mock('components/EmailShareModal', async () => {
    const { forwardRef, useImperativeHandle } = await import('react');
    return {
        default: forwardRef((_props, ref) => {
            useImperativeHandle(ref, () => ({ open: mockEmailOpen }));
            return null;
        }),
    };
});

import ShareButton from './index';

const baseProps = {
    title: 'Tokyo',
    url: 'https://datryp.com/city?name=Tokyo',
};

let openSpy: ReturnType<typeof vi.spyOn>;
const mockWriteText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
    mockEmailOpen.mockReset();
    mockWriteText.mockClear();
    openSpy = vi
        .spyOn(window, 'open')
        .mockReturnValue(null as unknown as Window);
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
    });
});

afterEach(() => {
    openSpy.mockRestore();
});

describe('ShareButton', () => {
    it('renders an icon trigger with an accessible name and no modal initially', () => {
        renderWithProviders(<ShareButton {...baseProps} />);
        expect(
            screen.getByRole('button', { name: 'Share Tokyo' })
        ).toBeInTheDocument();
        // ModalButton uses a MUI `Modal` (no role="dialog") — the shell is
        // titled by an <h2>, so probe the modal via its heading.
        expect(
            screen.queryByRole('heading', { name: 'Share' })
        ).not.toBeInTheDocument();
    });

    it('opens the share modal with named channels (no email/native by default)', async () => {
        renderWithProviders(<ShareButton {...baseProps} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Share Tokyo' })
        );
        expect(
            screen.getByRole('heading', { name: 'Share' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Share on Facebook' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Copy link' })
        ).toBeInTheDocument();
        // Email channel is gated on an emailPayload; native "More" on
        // navigator.share (absent in jsdom).
        expect(screen.queryByText('More')).not.toBeInTheDocument();
    });

    it('opens a Facebook share intent in a new tab', async () => {
        renderWithProviders(<ShareButton {...baseProps} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Share Tokyo' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Share on Facebook' })
        );
        expect(openSpy).toHaveBeenCalledTimes(1);
        expect(openSpy.mock.calls[0][0]).toMatch(/facebook\.com\/sharer/i);
    });

    it('copies the link to the clipboard and toasts', async () => {
        renderWithProviders(<ShareButton {...baseProps} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Share Tokyo' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Copy link' })
        );
        expect(mockWriteText).toHaveBeenCalledWith(baseProps.url);
        expect(
            await screen.findByText('Link copied to clipboard')
        ).toBeInTheDocument();
    });

    it('renders the pill variant as a named icon-only button', () => {
        renderWithProviders(<ShareButton {...baseProps} variant="pill" />);
        const pill = screen.getByRole('button', { name: 'Share Tokyo' });
        expect(pill).toHaveClass('share-button-pill');
    });

    it('exposes the Email channel and opens the email modal when payloaded', async () => {
        renderWithProviders(
            <ShareButton
                {...baseProps}
                emailPayload={
                    {
                        name: 'Tokyo',
                        country: 'Japan',
                    } as never
                }
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Share Tokyo' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Share via email' })
        );
        await waitFor(() => expect(mockEmailOpen).toHaveBeenCalledTimes(1));
    });
});
