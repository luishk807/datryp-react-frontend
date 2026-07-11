import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../test/renderWithProviders';
import type { Friend } from 'types';

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: { id: 'u1' } }),
}));

const mockMutateAsync = vi.fn();
vi.mock('api/hooks/useNotifyActivity', () => ({
    useNotifyActivity: () => ({
        mutateAsync: mockMutateAsync,
        isPending: false,
    }),
}));

import NotifyParticipantsButton from './index';

const participants = [
    { userId: 'u2', name: 'Bob' },
    { userId: 'u3', name: 'Cara' },
] as unknown as Friend[];

const props = {
    tripId: 'trip-1',
    activityId: 'act-1',
    activityName: 'Sushi class',
    participants,
};

const TRIGGER = 'Notify participants about this activity';

beforeEach(() => {
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue({
        recipients: 2,
        inApp: 2,
        emails: 0,
        sms: 0,
    });
});

// ModalButton wraps a MUI `Modal` (not `Dialog`), so there's no
// role="dialog"; the modal shell is `.modalCustom` titled by an <h2>.
const openModal = async () => {
    await userEvent.click(screen.getByRole('button', { name: TRIGGER }));
    const heading = await screen.findByRole('heading', {
        name: 'Notify participants',
    });
    return heading.closest('.modalCustom') as HTMLElement;
};

describe('NotifyParticipantsButton', () => {
    it('renders a named trigger and no modal initially', () => {
        renderWithProviders(<NotifyParticipantsButton {...props} />);
        expect(
            screen.getByRole('button', { name: TRIGGER })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Notify participants' })
        ).not.toBeInTheDocument();
    });

    it('lists notifiable participants (excluding the current user) as checkboxes', async () => {
        renderWithProviders(<NotifyParticipantsButton {...props} />);
        const dialog = await openModal();
        expect(
            within(dialog).getByRole('checkbox', { name: 'Bob' })
        ).toBeChecked();
        expect(
            within(dialog).getByRole('checkbox', { name: 'Cara' })
        ).toBeChecked();
    });

    it('sends to everyone (no recipientIds) and toasts the reach summary', async () => {
        renderWithProviders(<NotifyParticipantsButton {...props} />);
        const dialog = await openModal();
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Send alert' })
        );
        expect(mockMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                tripId: 'trip-1',
                activityId: 'act-1',
                recipientIds: undefined,
            })
        );
        expect(
            await screen.findByText('Alerted 2 people')
        ).toBeInTheDocument();
    });

    it('narrows the recipient list when a participant is deselected', async () => {
        renderWithProviders(<NotifyParticipantsButton {...props} />);
        const dialog = await openModal();
        await userEvent.click(
            within(dialog).getByRole('checkbox', { name: 'Bob' })
        );
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Send alert' })
        );
        expect(mockMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({ recipientIds: ['u3'] })
        );
    });

    it('disables Send when every participant is deselected', async () => {
        renderWithProviders(<NotifyParticipantsButton {...props} />);
        const dialog = await openModal();
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Clear all' })
        );
        expect(
            within(dialog).getByRole('button', { name: 'Send alert' })
        ).toBeDisabled();
    });

    it('shows an empty state when there is nobody else to notify', async () => {
        renderWithProviders(
            <NotifyParticipantsButton
                {...props}
                participants={
                    [{ userId: 'u1', name: 'Me' }] as unknown as Friend[]
                }
            />
        );
        const dialog = await openModal();
        expect(
            within(dialog).getByText('No other participants to notify yet.')
        ).toBeInTheDocument();
    });

    it('closes the modal from Cancel', async () => {
        renderWithProviders(<NotifyParticipantsButton {...props} />);
        const dialog = await openModal();
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Cancel' })
        );
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: 'Notify participants' })
            ).not.toBeInTheDocument()
        );
    });
});
