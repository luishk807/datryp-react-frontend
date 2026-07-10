import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import Status from './index';

describe('Status', () => {
    it('renders the Status label and an edit button by default', () => {
        renderWithProviders(<Status />);
        expect(screen.getByText(/Status/)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'edit' })
        ).toBeInTheDocument();
    });

    it('shows the status name from data', () => {
        renderWithProviders(<Status data={{ id: 1, name: 'Confirmed' }} />);
        expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });

    it('fires onClick when the edit button is pressed', async () => {
        const onClick = vi.fn();
        renderWithProviders(<Status onClick={onClick} />);
        await userEvent.click(screen.getByRole('button', { name: 'edit' }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('hides the edit button in view mode but still shows the status', () => {
        renderWithProviders(
            <Status isViewMode data={{ name: 'Planning' }} />
        );
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.getByText('Planning')).toBeInTheDocument();
    });
});
