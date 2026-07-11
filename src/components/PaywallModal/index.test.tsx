import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    act,
    waitFor,
} from '../../test/renderWithProviders';
import type { ModalButtonHandle } from 'components/ModalButton';

// PlanCards owns a Stripe-checkout mutation; stub it so the paywall test
// stays focused on this component's own copy + actions.
vi.mock('components/PlanCards', () => ({
    default: () => <div data-testid="plan-cards" />,
}));

import PaywallModal from './index';

const open = (over: Partial<Parameters<typeof PaywallModal>[0]> = {}) => {
    const ref = createRef<ModalButtonHandle>();
    const onDismiss = vi.fn();
    renderWithProviders(
        <PaywallModal
            ref={ref}
            currentCount={1}
            cap={3}
            onDismiss={onDismiss}
            {...over}
        />
    );
    act(() => ref.current?.openModel());
    return { ref, onDismiss };
};

describe('PaywallModal', () => {
    it('renders no content until opened via its ref', () => {
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(<PaywallModal ref={ref} currentCount={1} cap={3} />);
        expect(
            screen.queryByRole('heading', { name: 'Trip Limit Reached' })
        ).not.toBeInTheDocument();
    });

    it('opens with the default trip-cap copy, plan cards and links', () => {
        open();
        expect(
            screen.getByRole('heading', { name: 'Trip Limit Reached' })
        ).toBeInTheDocument();
        const headline = document.querySelector(
            '.paywall-modal-headline'
        ) as HTMLElement;
        expect(headline).toHaveTextContent('saved 1 of 3 trips');
        expect(screen.getByTestId('plan-cards')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'See plan comparison' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Terms of Use' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Not now' })
        ).toBeInTheDocument();
    });

    it('honours a custom title, headline and body', () => {
        open({
            title: 'Pro feature',
            headline: <span>Custom headline here</span>,
            body: 'Custom body copy',
        });
        expect(
            screen.getByRole('heading', { name: 'Pro feature' })
        ).toBeInTheDocument();
        expect(screen.getByText('Custom headline here')).toBeInTheDocument();
        expect(screen.getByText('Custom body copy')).toBeInTheDocument();
    });

    it('uses the singular "trip" when the cap is 1', () => {
        open({ currentCount: 0, cap: 1 });
        const headline = document.querySelector(
            '.paywall-modal-headline'
        ) as HTMLElement;
        expect(headline).toHaveTextContent('0 of 1 trip on the free plan.');
        expect(headline).not.toHaveTextContent('trips');
    });

    it('dismisses and closes when "Not now" is clicked', async () => {
        const { onDismiss } = open();
        await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: 'Trip Limit Reached' })
            ).not.toBeInTheDocument()
        );
    });
});
