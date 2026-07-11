import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    act,
    waitFor,
} from '../../test/renderWithProviders';
import ModalButton, { type ModalButtonHandle } from './index';

describe('ModalButton', () => {
    it('renders the trigger and keeps content closed until clicked', async () => {
        renderWithProviders(
            <ModalButton title="My modal" buttonProps={{ title: 'Open dialog' }}>
                <p>Body content</p>
            </ModalButton>
        );
        const trigger = screen.getByRole('button', { name: 'Open dialog' });
        expect(trigger).toBeInTheDocument();
        expect(screen.queryByText('Body content')).not.toBeInTheDocument();

        await userEvent.click(trigger);
        expect(
            screen.getByRole('heading', { name: 'My modal' })
        ).toBeInTheDocument();
        expect(screen.getByText('Body content')).toBeInTheDocument();
    });

    it('does not render a trigger when buttonProps is null', () => {
        renderWithProviders(
            <ModalButton title="No trigger" buttonProps={null}>
                <p>Body</p>
            </ModalButton>
        );
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('applies containerClassName to the .modalCustom shell and renders a close control', async () => {
        renderWithProviders(
            <ModalButton
                title="Scoped modal"
                buttonProps={{ title: 'Open' }}
                containerClassName="scoped-modal"
            >
                <p>Inside</p>
            </ModalButton>
        );
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        const shell = screen
            .getByRole('heading', { name: 'Scoped modal' })
            .closest('.modalCustom');
        expect(shell).toHaveClass('scoped-modal');
        expect(
            screen.getByRole('button', { name: 'Close' })
        ).toBeInTheDocument();
    });

    it('renders an optional header action', async () => {
        renderWithProviders(
            <ModalButton
                title="With action"
                buttonProps={{ title: 'Open' }}
                headerAction={<button type="button">Edit</button>}
            >
                <p>Inside</p>
            </ModalButton>
        );
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        expect(
            screen.getByRole('button', { name: 'Edit' })
        ).toBeInTheDocument();
    });

    it('fires onOpen / onClose and opens + closes via its ref', async () => {
        const onOpen = vi.fn();
        const onClose = vi.fn();
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(
            <ModalButton
                ref={ref}
                title="Ref modal"
                buttonProps={null}
                onOpen={onOpen}
                onClose={onClose}
            >
                <p>Ref body</p>
            </ModalButton>
        );
        act(() => ref.current?.openModel());
        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Ref body')).toBeInTheDocument();

        act(() => ref.current?.closeModal());
        expect(onClose).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(screen.queryByText('Ref body')).not.toBeInTheDocument()
        );
    });

    it('closes when the X button is clicked', async () => {
        const onClose = vi.fn();
        renderWithProviders(
            <ModalButton
                title="Closable"
                buttonProps={{ title: 'Open' }}
                onClose={onClose}
            >
                <p>Closable body</p>
            </ModalButton>
        );
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(screen.queryByText('Closable body')).not.toBeInTheDocument()
        );
    });
});
