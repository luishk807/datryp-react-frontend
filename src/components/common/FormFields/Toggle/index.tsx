import type { ReactNode } from 'react';
import classnames from 'classnames';
import './index.scss';

export interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    /**
     * Optional secondary line rendered under the label (muted, smaller).
     * When present the label + description stack in a text column to the
     * right of the switch; without it the toggle stays a single centered row.
     */
    description?: ReactNode;
}

/**
 * Switch-style toggle (visually distinct from `CheckBoxCustom`, which renders a
 * tick-style MUI checkbox). Built on a native `<input type="checkbox">` for
 * accessibility; the visible track/thumb are CSS-only.
 */
const Toggle = ({
    label,
    checked,
    onChange,
    disabled = false,
    description,
}: ToggleProps) => (
    <label
        className={classnames('toggle', {
            'has-description': Boolean(description),
        })}
    >
        <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-track">
            <span className="toggle-thumb" />
        </span>
        <span className="toggle-text">
            <span className="toggle-label">{label}</span>
            {description && (
                <span className="toggle-description">{description}</span>
            )}
        </span>
    </label>
);

export default Toggle;
