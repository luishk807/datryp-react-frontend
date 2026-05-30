/**
 * Reusable "Home base" picker block: a privacy hint paragraph above a
 * city autocomplete bound to the user's home city. Designed to drop
 * straight into a settings/profile form alongside the other bare
 * variant fields (InputField, DropDown). Used in Account → Profile
 * today; safe to reuse in any future onboarding step that wants the
 * same control.
 *
 * Usage:
 *
 *     <HomeBaseField
 *         value={homeBase}
 *         onChange={setHomeBase}
 *         disabled={updatePrefs.isPending}
 *     />
 */
import CityAutocomplete, {
    type CitySelection,
} from 'components/common/FormFields/CityAutocomplete';
import './index.scss';

export interface HomeBaseFieldProps {
    /** Current home-city selection. Null when the user hasn't set one. */
    value: CitySelection | null;
    /** Fires when the user picks (or clears) a city. Parent persists
     *  via its own save handler — this component never writes to the
     *  server directly. */
    onChange: (next: CitySelection | null) => void;
    /** Disable while a parent save is in flight. */
    disabled?: boolean;
    /** Override the visible label above the picker. */
    label?: string;
}

const HomeBaseField = ({
    value,
    onChange,
    disabled,
    label = 'Current place of residence',
}: HomeBaseFieldProps) => {
    return (
        <div className="home-base-field">
            <p className="home-base-field-hint">
                Current place of residence — we only store your city, not
                your street address. Drives the nearest-airport / train-
                station suggestion on new trips, the depart-origin on
                Google Maps directions, and the personalized homepage
                picks.
            </p>
            <CityAutocomplete
                variant="bare"
                label={label}
                placeholder="Search a city (e.g. Madrid, Tokyo)"
                value={value}
                onChange={onChange}
                disabled={disabled}
            />
        </div>
    );
};

export default HomeBaseField;
