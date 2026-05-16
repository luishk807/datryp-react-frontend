import './index.scss';

export interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}

/**
 * Switch-style toggle (visually distinct from `CheckBoxCustom`, which renders a
 * tick-style MUI checkbox). Built on a native `<input type="checkbox">` for
 * accessibility; the visible track/thumb are CSS-only.
 */
const Toggle = ({ label, checked, onChange, disabled = false }: ToggleProps) => (
    <label className="toggle">
        <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-track">
            <span className="toggle-thumb" />
        </span>
        <span className="toggle-label">{label}</span>
    </label>
);

export default Toggle;
