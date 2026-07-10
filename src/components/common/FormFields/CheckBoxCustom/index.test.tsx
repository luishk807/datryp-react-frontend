import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckBoxCustom from './index';

describe('CheckBoxCustom', () => {
    it('renders the provided label as the checkbox accessible name', () => {
        render(<CheckBoxCustom label="Accept terms" />);
        expect(
            screen.getByRole('checkbox', { name: 'Accept terms' })
        ).toBeInTheDocument();
    });

    it('reflects defaultCheck=true', () => {
        render(<CheckBoxCustom label="Accept terms" defaultCheck />);
        expect(
            screen.getByRole('checkbox', { name: 'Accept terms' })
        ).toBeChecked();
    });

    it('is unchecked when defaultCheck is omitted', () => {
        render(<CheckBoxCustom label="Accept terms" />);
        expect(
            screen.getByRole('checkbox', { name: 'Accept terms' })
        ).not.toBeChecked();
    });

    it('fires onClick when the box is clicked', async () => {
        const onClick = vi.fn();
        render(<CheckBoxCustom label="Accept terms" onClick={onClick} />);
        await userEvent.click(
            screen.getByRole('checkbox', { name: 'Accept terms' })
        );
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
