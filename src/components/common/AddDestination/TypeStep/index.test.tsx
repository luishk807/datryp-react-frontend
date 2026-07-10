import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';
import { ACTIVITY_KIND } from 'constants';
import TypeStep, { LATER, type TypeStepProps } from './index';

const setup = (over: Partial<TypeStepProps> = {}) => {
    const onPick = vi.fn();
    const onSmartSubmit = vi.fn();
    renderWithProviders(
        <TypeStep
            currentKind={null}
            laterActive={false}
            onPick={onPick}
            onSmartSubmit={onSmartSubmit}
            {...over}
        />
    );
    return { onPick, onSmartSubmit };
};

describe('AddDestination/TypeStep', () => {
    it('renders the headline and all five transport tiles as a tablist', () => {
        setup();
        expect(
            screen.getByRole('heading', { name: 'Where to?' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('tablist', { name: 'Transport type' })
        ).toBeInTheDocument();
        ['Flight', 'Train', 'Bus', 'Rental Car', 'add later'].forEach((name) =>
            expect(
                screen.getByRole('tab', { name: new RegExp(name) })
            ).toBeInTheDocument()
        );
    });

    it('fires onPick with the kind when a transport tile is clicked', async () => {
        const { onPick } = setup();
        await userEvent.click(screen.getByRole('tab', { name: /Flight/ }));
        expect(onPick).toHaveBeenCalledWith(ACTIVITY_KIND.FLIGHT);
    });

    it('fires onPick with the LATER sentinel for the add-later tile', async () => {
        const { onPick } = setup();
        await userEvent.click(screen.getByRole('tab', { name: /add later/ }));
        expect(onPick).toHaveBeenCalledWith(LATER);
    });

    it('marks the current kind tile as selected', () => {
        setup({ currentKind: ACTIVITY_KIND.TRAIN });
        expect(screen.getByRole('tab', { name: /Train/ })).toHaveAttribute(
            'aria-selected',
            'true'
        );
        expect(screen.getByRole('tab', { name: /Flight/ })).toHaveAttribute(
            'aria-selected',
            'false'
        );
    });

    it('highlights the later tile only when laterActive is set', () => {
        setup({ laterActive: true });
        expect(screen.getByRole('tab', { name: /add later/ })).toHaveAttribute(
            'aria-selected',
            'true'
        );
    });

    it('submits the smart box with trimmed text', async () => {
        const { onSmartSubmit } = setup();
        await userEvent.type(screen.getByRole('textbox'), '  EWR to Panama  ');
        await userEvent.click(
            screen.getByRole('button', { name: 'Detect and continue' })
        );
        expect(onSmartSubmit).toHaveBeenCalledWith('EWR to Panama');
    });

    it('disables the smart submit until text is entered', async () => {
        setup();
        const submit = screen.getByRole('button', {
            name: 'Detect and continue',
        });
        expect(submit).toBeDisabled();
        await userEvent.type(screen.getByRole('textbox'), 'Tokyo');
        expect(submit).toBeEnabled();
    });

    it('hides the smart box and OR divider in tiles-only (edit) mode', () => {
        renderWithProviders(
            <TypeStep currentKind={null} laterActive={false} onPick={vi.fn()} />
        );
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Detect and continue' })
        ).not.toBeInTheDocument();
        // The tiles still render.
        expect(screen.getByRole('tab', { name: /Flight/ })).toBeInTheDocument();
    });
});
