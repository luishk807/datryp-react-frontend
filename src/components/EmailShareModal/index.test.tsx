import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    act,
    waitFor,
} from '../../test/renderWithProviders';
import type { SharePlacePayload } from 'types';

let mockUser: { name?: string } | null = { name: 'Luis' };
let mockIsPending = false;
let mockIsSuccess = false;
const mockMutate = vi.fn();
const mockReset = vi.fn();

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

vi.mock('api/hooks/useShareEmail', () => ({
    useShareEmail: () => ({
        mutate: mockMutate,
        isPending: mockIsPending,
        isSuccess: mockIsSuccess,
        reset: mockReset,
    }),
}));

import EmailShareModal, { type EmailShareModalHandle } from './index';

const place: SharePlacePayload = {
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'France',
    description: '',
    image_url: null,
};
const searchUrl = 'https://datryp.com/place?id=1';

const RECIPIENTS_PLACEHOLDER = 'alex@example.com, jamie@example.com';

const open = () => {
    const ref = createRef<EmailShareModalHandle>();
    renderWithProviders(
        <EmailShareModal ref={ref} place={place} searchUrl={searchUrl} />
    );
    act(() => ref.current?.open());
    return ref;
};

beforeEach(() => {
    mockUser = { name: 'Luis' };
    mockIsPending = false;
    mockIsSuccess = false;
    mockMutate.mockReset();
    mockReset.mockReset();
});

describe('EmailShareModal', () => {
    it('renders no content until opened via its ref', () => {
        const ref = createRef<EmailShareModalHandle>();
        renderWithProviders(
            <EmailShareModal ref={ref} place={place} searchUrl={searchUrl} />
        );
        expect(
            screen.queryByRole('heading', { name: 'Email this place' })
        ).not.toBeInTheDocument();
    });

    it('opens with the place context and labelled inputs', () => {
        open();
        expect(
            screen.getByRole('heading', { name: 'Email this place' })
        ).toBeInTheDocument();
        expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
        expect(screen.getByText('Paris · France')).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText(RECIPIENTS_PLACEHOLDER)
        ).toBeInTheDocument();
    });

    it('gates Send on at least one valid, no invalid, recipient', async () => {
        open();
        expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

        const input = screen.getByPlaceholderText(RECIPIENTS_PLACEHOLDER);
        await userEvent.type(input, 'not-an-email');
        expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

        await userEvent.clear(input);
        await userEvent.type(input, 'alex@example.com');
        expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
    });

    it('submits the parsed recipients + context through the mutation', async () => {
        open();
        await userEvent.type(
            screen.getByPlaceholderText(RECIPIENTS_PLACEHOLDER),
            'alex@example.com'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                to: ['alex@example.com'],
                place,
                search_url: searchUrl,
                sender_name: 'Luis',
                personal_message: null,
            }),
            expect.any(Object)
        );
    });

    it('shows a sending label and disables Send while pending', () => {
        mockIsPending = true;
        open();
        expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    });

    it('announces success via a status region', async () => {
        mockIsSuccess = true;
        open();
        await waitFor(() =>
            expect(screen.getByRole('status')).toBeInTheDocument()
        );
    });
});
