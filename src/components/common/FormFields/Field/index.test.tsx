import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Field from './index';

describe('Field', () => {
    it('renders the label text', () => {
        render(
            <Field label="Trip type">
                <select />
            </Field>
        );
        expect(screen.getByText('Trip type')).toBeInTheDocument();
    });

    it('renders arbitrary children', () => {
        render(
            <Field label="Options">
                <div data-testid="child">Custom content</div>
            </Field>
        );
        expect(screen.getByTestId('child')).toHaveTextContent(
            'Custom content'
        );
    });

    it('associates the wrapping label with a single control (accessible name)', () => {
        render(
            <Field label="Country">
                <select>
                    <option value="fr">France</option>
                </select>
            </Field>
        );
        // The wrapping <label> gives the enclosed control its accessible name.
        expect(
            screen.getByRole('combobox', { name: 'Country' })
        ).toBeInTheDocument();
    });
});
