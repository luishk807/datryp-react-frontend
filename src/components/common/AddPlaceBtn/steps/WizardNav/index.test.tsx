import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../../test/renderWithProviders';
import WizardNav from './index';

describe('WizardNav', () => {
    it('renders Back when onBack is set and fires it on click', async () => {
        const onBack = vi.fn();
        renderWithProviders(<WizardNav onBack={onBack} onNext={() => {}} />);
        const back = screen.getByRole('button', { name: 'Back' });
        await userEvent.click(back);
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('omits the Back button on the first step (no onBack)', () => {
        renderWithProviders(<WizardNav onNext={() => {}} />);
        expect(
            screen.queryByRole('button', { name: 'Back' })
        ).not.toBeInTheDocument();
    });

    it('renders Next and fires onNext when enabled', async () => {
        const onNext = vi.fn();
        renderWithProviders(<WizardNav onBack={() => {}} onNext={onNext} />);
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('disables Next and never fires it when nextDisabled', async () => {
        const onNext = vi.fn();
        renderWithProviders(<WizardNav onNext={onNext} nextDisabled />);
        const next = screen.getByRole('button', { name: 'Next' });
        expect(next).toBeDisabled();
        await userEvent.click(next);
        expect(onNext).not.toHaveBeenCalled();
    });

    it('renders the Confirm button and fires onConfirm', async () => {
        const onConfirm = vi.fn();
        renderWithProviders(
            <WizardNav onBack={() => {}} onConfirm={onConfirm} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('prefers Confirm over Next when both are provided', () => {
        renderWithProviders(
            <WizardNav onNext={() => {}} onConfirm={() => {}} />
        );
        expect(
            screen.getByRole('button', { name: 'Add activity' })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Next' })
        ).not.toBeInTheDocument();
    });

    it('disables Confirm and shows a spinner while confirmDisabled', () => {
        renderWithProviders(
            <WizardNav onConfirm={() => {}} confirmDisabled />
        );
        expect(
            screen.getByRole('button', { name: /Add activity/ })
        ).toBeDisabled();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('honors custom Back / Next / Confirm labels', () => {
        const { rerender } = renderWithProviders(
            <WizardNav
                onBack={() => {}}
                onNext={() => {}}
                backLabel="Cancel"
                nextLabel="Search"
            />
        );
        expect(
            screen.getByRole('button', { name: 'Cancel' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Search' })
        ).toBeInTheDocument();

        rerender(
            <WizardNav onConfirm={() => {}} confirmLabel="Save it" />
        );
        expect(
            screen.getByRole('button', { name: 'Save it' })
        ).toBeInTheDocument();
    });
});
