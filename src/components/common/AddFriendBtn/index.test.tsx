import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    act,
} from '../../../test/renderWithProviders';
import AddFriendBtn from './index';
import type { ModalButtonHandle } from '../../ModalButton';

describe('AddFriendBtn', () => {
    it('renders no modal content until opened via its ref', () => {
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(<AddFriendBtn ref={ref} />);
        expect(
            screen.queryByRole('heading', { name: 'Add Friend' })
        ).not.toBeInTheDocument();
    });

    it('opens the Add Friend form with labelled fields', () => {
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(<AddFriendBtn ref={ref} />);
        act(() => ref.current?.openModel());
        expect(
            screen.getByRole('heading', { name: 'Add Friend' })
        ).toBeInTheDocument();
        expect(screen.getByLabelText('First Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Add Friend' })
        ).toBeInTheDocument();
    });

    it('submits the typed values through onChange', async () => {
        const onChange = vi.fn();
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(<AddFriendBtn ref={ref} onChange={onChange} />);
        act(() => ref.current?.openModel());

        await userEvent.type(screen.getByLabelText('First Name'), 'Ada');
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Friend' })
        );
        expect(onChange).toHaveBeenCalledWith({ firstName: 'Ada' });
    });

    it('submits null when no field has been touched', async () => {
        const onChange = vi.fn();
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(<AddFriendBtn ref={ref} onChange={onChange} />);
        act(() => ref.current?.openModel());

        await userEvent.click(
            screen.getByRole('button', { name: 'Add Friend' })
        );
        expect(onChange).toHaveBeenCalledWith(null);
    });

    it('does not throw when submitted without an onChange handler', async () => {
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(<AddFriendBtn ref={ref} />);
        act(() => ref.current?.openModel());

        await userEvent.click(
            screen.getByRole('button', { name: 'Add Friend' })
        );
        expect(
            screen.getByRole('heading', { name: 'Add Friend' })
        ).toBeInTheDocument();
    });
});
