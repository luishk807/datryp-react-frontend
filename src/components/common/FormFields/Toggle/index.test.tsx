import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toggle from './index';

describe('Toggle', () => {
    it('renders the label and reflects checked=true', () => {
        render(<Toggle label="Email alerts" checked onChange={() => {}} />);
        expect(
            screen.getByRole('checkbox', { name: 'Email alerts' })
        ).toBeChecked();
    });

    it('is unchecked when checked=false', () => {
        render(<Toggle label="Email alerts" checked={false} onChange={() => {}} />);
        expect(
            screen.getByRole('checkbox', { name: 'Email alerts' })
        ).not.toBeChecked();
    });

    it('calls onChange with the toggled boolean when clicked', async () => {
        const onChange = vi.fn();
        render(
            <Toggle label="Email alerts" checked={false} onChange={onChange} />
        );
        await userEvent.click(
            screen.getByRole('checkbox', { name: 'Email alerts' })
        );
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('does not fire onChange when disabled', async () => {
        const onChange = vi.fn();
        render(
            <Toggle
                label="Email alerts"
                checked={false}
                onChange={onChange}
                disabled
            />
        );
        const cb = screen.getByRole('checkbox', { name: 'Email alerts' });
        expect(cb).toBeDisabled();
        await userEvent.click(cb);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('renders an optional description line', () => {
        render(
            <Toggle
                label="Email alerts"
                checked
                onChange={() => {}}
                description="We'll email you about your trips"
            />
        );
        expect(
            screen.getByText("We'll email you about your trips")
        ).toBeInTheDocument();
    });
});
