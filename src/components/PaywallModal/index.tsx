import { forwardRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import PlanCards from 'components/PlanCards';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

interface PaywallModalProps {
    /** Number of items (trips, bucket entries, …) the user currently has. */
    currentCount: number;
    /** The cap they hit. For trips this is FREE_TIER_TRIP_LIMIT; for
     *  bucket-list it's FREE_TIER_BUCKET_LIST_LIMIT; etc. */
    cap: number;
    /** Modal title. Defaults to "Trip Limit Reached" so existing trip-cap
     *  callers don't need to pass it. */
    title?: string;
    /** Headline paragraph. Defaults to the trip-cap "X of Y trips saved"
     *  copy. Pass JSX to fully replace it (used by the bucket-list paywall
     *  to show different wording for "hit cap" vs "Pro feature"). */
    headline?: ReactNode;
    /** Sub-headline body copy. Defaults to the trip-cap pitch. */
    body?: ReactNode;
    /** Fires when the user dismisses the modal. The parent should clear any
     *  paywall state it kept. */
    onDismiss?: () => void;
}

/**
 * Free-tier paywall modal — shown whenever a mutation hits a server-side
 * cap (trip limit, bucket-list cap, etc.) or attempts a Pro-only action.
 * Imperative open via `ref.current.openModel()`; the parent decides when
 * to open it after catching the relevant typed error.
 *
 * The plan-selection grid is the shared `PlanCards` component, also used
 * by the Account page Subscription section for voluntary upgrades.
 */
const PaywallModal = forwardRef<ModalButtonHandle, PaywallModalProps>(
    ({ currentCount, cap, title, headline, body, onDismiss }, ref) => {
        const handleClose = () => {
            (ref as React.RefObject<ModalButtonHandle>)?.current?.closeModal();
            onDismiss?.();
        };

        const defaultHeadline = (
            <>
                You&rsquo;ve saved <strong>{currentCount}</strong> of{' '}
                <strong>{cap}</strong> trip{cap === 1 ? '' : 's'} on the free
                plan.
            </>
        );
        const defaultBody =
            'DaTryp.com Pro removes the limit so you can plan as many trips as you like, plus Advanced AI Search for richer recommendations.';

        return (
            <ModalButton ref={ref} title={title ?? 'Trip Limit Reached'}>
                <div className="paywall-modal">
                    <p className="paywall-modal-headline">
                        {headline ?? defaultHeadline}
                    </p>
                    <p className="paywall-modal-body">{body ?? defaultBody}</p>

                    <PlanCards />

                    <p className="paywall-modal-compare">
                        Want the full breakdown?{' '}
                        <Link
                            to="/membership"
                            className="paywall-modal-link"
                            onClick={handleClose}
                        >
                            See plan comparison
                        </Link>
                    </p>

                    <p className="paywall-modal-footnote">
                        By starting a trial you agree to our{' '}
                        <Link to="/terms" className="paywall-modal-link">
                            Terms of Use
                        </Link>
                        . You can cancel from the billing portal before day
                        31 to avoid any charge.
                    </p>

                    <div className="paywall-modal-actions">
                        <ButtonCustom
                            type={BUTTON_VARIANT.LINE}
                            onClick={handleClose}
                        >
                            Not now
                        </ButtonCustom>
                    </div>
                </div>
            </ModalButton>
        );
    }
);

PaywallModal.displayName = 'PaywallModal';

export default PaywallModal;
