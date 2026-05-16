import type { ReactNode } from 'react';
import './index.scss';

export interface FieldProps {
    label: string;
    children: ReactNode;
}

/**
 * Labeled form-group wrapper. Renders a stacked label above arbitrary children
 * (a `<select>`, a Toggle group, anything that isn't a single input). For a
 * single labeled text input, prefer `<InputField variant="bare" label="..." />`
 * which has the same visual shape but also owns the input.
 */
const Field = ({ label, children }: FieldProps) => (
    <label className="field">
        <span className="field-label">{label}</span>
        {children}
    </label>
);

export default Field;
