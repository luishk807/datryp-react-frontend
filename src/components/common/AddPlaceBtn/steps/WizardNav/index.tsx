import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

export interface WizardNavProps {
    /** Shows the Back button when set — Step 1 has nothing to go back to. */
    onBack?: () => void;
    /** Advances to the next step. Omit on the final step. */
    onNext?: () => void;
    /** Final-step confirm action. When set, renders the primary
     *  "Add activity" button instead of "Next". */
    onConfirm?: () => void;
    nextLabel?: string;
    confirmLabel?: string;
}

/** Back / Next / Add footer for the Add-Activity wizard. Step 1 has no
 *  footer (tiles advance on tap); Steps 2 and 3 use this. */
const WizardNav = ({
    onBack,
    onNext,
    onConfirm,
    nextLabel = 'Next',
    confirmLabel = 'Add activity',
}: WizardNavProps) => (
    <div className="add-wizard-nav">
        {onBack ? (
            <ButtonCustom
                label="Back"
                type={BUTTON_VARIANT.LINE}
                onClick={onBack}
            />
        ) : (
            <span />
        )}
        {onConfirm ? (
            <ButtonCustom
                label={confirmLabel}
                type={BUTTON_VARIANT.STANDARD}
                capitalizeType="uppercase"
                onClick={onConfirm}
            />
        ) : onNext ? (
            <ButtonCustom
                label={nextLabel}
                type={BUTTON_VARIANT.STANDARD}
                onClick={onNext}
            />
        ) : (
            <span />
        )}
    </div>
);

export default WizardNav;
