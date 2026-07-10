import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../../test/renderWithProviders';
import { ADD_METHOD } from 'constants';
import type { AddMethod } from 'types';
import MethodStep from './index';

const ALL: AddMethod[] = [
    ADD_METHOD.SUGGESTIONS,
    ADD_METHOD.SMART,
    ADD_METHOD.SEARCH,
    ADD_METHOD.CUSTOM,
];

describe('MethodStep', () => {
    it('renders the headline and every applicable method as a listitem', () => {
        renderWithProviders(<MethodStep methods={ALL} onPick={() => {}} />);
        expect(
            screen.getByText('How would you like to add it?')
        ).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(4);
        expect(screen.getByText('Suggestions')).toBeInTheDocument();
        expect(screen.getByText('Smart search')).toBeInTheDocument();
        expect(screen.getByText('Find my flight')).toBeInTheDocument();
        expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('fires onPick with the chosen method', async () => {
        const onPick = vi.fn();
        renderWithProviders(<MethodStep methods={ALL} onPick={onPick} />);
        await userEvent.click(screen.getByText('Find my flight'));
        expect(onPick).toHaveBeenCalledWith(ADD_METHOD.SEARCH);
        await userEvent.click(screen.getByText('Smart search'));
        expect(onPick).toHaveBeenCalledWith(ADD_METHOD.SMART);
    });

    it('renders only the subset of methods it is given', () => {
        renderWithProviders(
            <MethodStep
                methods={[ADD_METHOD.SMART, ADD_METHOD.CUSTOM]}
                onPick={() => {}}
            />
        );
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(screen.getByText('Smart search')).toBeInTheDocument();
        expect(screen.getByText('Custom')).toBeInTheDocument();
        expect(screen.queryByText('Suggestions')).not.toBeInTheDocument();
        expect(screen.queryByText('Find my flight')).not.toBeInTheDocument();
    });
});
