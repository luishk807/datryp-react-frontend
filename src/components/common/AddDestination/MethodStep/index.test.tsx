import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';
import { ADD_METHOD } from 'constants';
import MethodStep from './index';

describe('AddDestination/MethodStep', () => {
    it('renders the flight method set (smart, find-my-flight, custom)', () => {
        renderWithProviders(
            <MethodStep
                methods={[
                    ADD_METHOD.SMART,
                    ADD_METHOD.SEARCH,
                    ADD_METHOD.CUSTOM,
                ]}
                onPick={vi.fn()}
            />
        );
        expect(
            screen.getByRole('heading', {
                name: 'How would you like to add it?',
            })
        ).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        expect(screen.getByText('Smart search')).toBeInTheDocument();
        expect(screen.getByText('Find my flight')).toBeInTheDocument();
        expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('renders only smart + custom for ground kinds', () => {
        renderWithProviders(
            <MethodStep
                methods={[ADD_METHOD.SMART, ADD_METHOD.CUSTOM]}
                onPick={vi.fn()}
            />
        );
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(screen.queryByText('Find my flight')).not.toBeInTheDocument();
    });

    it('fires onPick with the chosen method', async () => {
        const onPick = vi.fn();
        renderWithProviders(
            <MethodStep
                methods={[ADD_METHOD.SMART, ADD_METHOD.CUSTOM]}
                onPick={onPick}
            />
        );
        await userEvent.click(screen.getByText('Custom'));
        expect(onPick).toHaveBeenCalledWith(ADD_METHOD.CUSTOM);
    });

    it('skips methods with no tile metadata (e.g. SUGGESTIONS)', () => {
        renderWithProviders(
            <MethodStep
                methods={[ADD_METHOD.SUGGESTIONS, ADD_METHOD.SMART]}
                onPick={vi.fn()}
            />
        );
        // SUGGESTIONS has no META entry → rendered as null, so only SMART shows.
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
        expect(screen.getByText('Smart search')).toBeInTheDocument();
    });
});
