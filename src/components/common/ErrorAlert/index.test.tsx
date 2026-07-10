import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import ErrorAlert from './index';

describe('ErrorAlert', () => {
    it('renders nothing when there are no children', () => {
        const { container } = renderWithProviders(<ErrorAlert />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders its message inside an assertive alert region', () => {
        renderWithProviders(<ErrorAlert>Something broke</ErrorAlert>);
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Something broke');
    });

    it('is not conveyed by color alone — the message is real text', () => {
        renderWithProviders(<ErrorAlert>Email is required</ErrorAlert>);
        // A screen reader announces the text; the role is the a11y signal,
        // not just a red style.
        expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('merges a custom className with the base class', () => {
        renderWithProviders(
            <ErrorAlert className="field-error">Bad value</ErrorAlert>
        );
        const alert = screen.getByRole('alert');
        expect(alert).toHaveClass('error-alert');
        expect(alert).toHaveClass('field-error');
    });
});
