import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import PlanCards from 'components/PlanCards';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

interface PaywallModalProps {
    /** Number of trips the user currently has saved. */
    currentCount: number;
    /** Their effective cap. For free users this is FREE_TIER_TRIP_LIMIT
     *  unless they were grandfathered in pre-paywall. */
    cap: number;
    /** Fires when the user dismisses the modal. The parent should clear any
     *  paywall state it kept. */
    onDismiss?: () => void;
}

/**
 * Free-tier paywall modal — shown when a save_itinerary mutation hits the
 * server-side trip cap. Imperative open via `ref.current.openModel()`; the
 * parent decides when to open it after catching a `TripCapReachedError`.
 *
 * The plan-selection grid is the shared `PlanCards` component, also used by
 * the Account page Subscription section for voluntary upgrades.
 */
const PaywallModal = forwardRef<ModalButtonHandle, PaywallModalProps>(
    ({ currentCount, cap, onDismiss }, ref) => {
        const handleClose = () => {
            (ref as React.RefObject<ModalButtonHandle>)?.current?.closeModal();
            onDismiss?.();
        };

        return (
            <ModalButton ref={ref} title="Trip Limit Reached">
                <div className="paywall-modal">
                    <p className="paywall-modal-headline">
                        You&rsquo;ve saved <strong>{currentCount}</strong> of{' '}
                        <strong>{cap}</strong> trip{cap === 1 ? '' : 's'} on
                        the free plan.
                    </p>
                    <p className="paywall-modal-body">
                        daTryp Pro removes the limit so you can plan as many
                        trips as you like, plus Advanced AI Search for richer
                        recommendations.
                    </p>

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
