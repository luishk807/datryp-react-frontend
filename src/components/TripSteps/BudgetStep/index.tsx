import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import InputField from 'components/common/FormFields/InputField';
import type { TripChangeEvent, TripState } from 'types';
import './index.scss';

interface BudgetStepProps {
    data: TripState | undefined;
    onChange: (id: string, e: TripChangeEvent) => void;
}

const BudgetStep = ({ data, onChange }: BudgetStepProps) => {
    const value = String(data?.budget ?? '');

    return (
        <div className="trip-budget-step">
            <h2 className="trip-step-headline">What's your budget?</h2>
            <p className="trip-step-sub">
                Ballpark is fine — you can split per activity later. Leave 0 if
                you're flexible.
            </p>

            <div className="trip-budget-field">
                <label className="trip-budget-label">
                    <PaymentsOutlinedIcon /> Total budget
                </label>
                <InputField
                    defaultValue={value}
                    name="budget"
                    placeholder="e.g. 2000"
                    onChange={(e) => onChange('budget', e)}
                />
            </div>
        </div>
    );
};

export default BudgetStep;
