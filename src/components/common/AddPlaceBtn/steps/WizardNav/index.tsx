import { CircularProgress } from '@mui/material';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

export interface WizardNavProps {
    /** Shows the Back button when set — Step 1 has nothing to go back to. */
    onBack?: () => void;
    /** Advances to the next step. Omit on the final step. */
    onNext?: () => void;
    /** Disables the Next button (e.g. required input not yet valid).
     *  Only applies to the Next variant, not Confirm. */
    nextDisabled?: boolean;
    /** Final-step confirm action. When set, renders the primary
     *  "Add activity" button instead of "Next". */
    onConfirm?: () => void;
    /** Disables the Confirm button and shows an inline spinner — used while
     *  a PLACE smart entry is still resolving (location / cost / time +
     *  corrected name) so the user can't add a half-resolved activity. */
    confirmDisabled?: boolean;
    /** Label for the Back button — defaults to "Back"; the review's
     *  in-place edit sub-view overrides it to "Cancel". */
    backLabel?: string;
    nextLabel?: string;
    confirmLabel?: string;
}

/** Back / Next / Add footer for the Add-Activity wizard. Step 1 has
 *  no footer (tiles advance on tap); Steps 2 and 3 use this. The review
 *  step's Edit affordance lives in the modal header, not here. */
const WizardNav = ({
    onBack,
    onNext,
    nextDisabled = false,
    onConfirm,
    confirmDisabled = false,
    backLabel = 'Back',
    nextLabel = 'Next',
    confirmLabel = 'Add activity',
}: WizardNavProps) => (
    <div className="add-wizard-nav">
        {onBack ? (
            <ButtonCustom
                label={backLabel}
                type={BUTTON_VARIANT.LINE}
                onClick={onBack}
            />
        ) : (
            <span />
        )}
        {onConfirm ? (
            <ButtonCustom
                type={BUTTON_VARIANT.STANDARD}
                capitalizeType="uppercase"
                disabled={confirmDisabled}
                onClick={onConfirm}
            >
                {confirmDisabled ? (
                    <span className="add-wizard-confirm-loading">
                        <CircularProgress
                            size={18}
                            className="add-wizard-confirm-spinner"
                        />
                        {confirmLabel}
                    </span>
                ) : (
                    confirmLabel
                )}
            </ButtonCustom>
        ) : onNext ? (
            <ButtonCustom
                label={nextLabel}
                type={BUTTON_VARIANT.STANDARD}
                disabled={nextDisabled}
                onClick={onNext}
            />
        ) : (
            <span />
        )}
    </div>
);

export default WizardNav;
