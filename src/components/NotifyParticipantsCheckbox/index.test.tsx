import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import NotifyParticipantsCheckbox from './index';

const ON_LABEL = 'Participants will be notified of changes';
const OFF_LABEL =
    'Participants will NOT be notified of changes (click to enable)';

describe('NotifyParticipantsCheckbox', () => {
    it('renders an ON bell with an accessible name and aria-pressed=true', () => {
        renderWithProviders(
            <NotifyParticipantsCheckbox checked onChange={vi.fn()} />
        );
        const btn = screen.getByRole('button', { name: ON_LABEL });
        expect(btn).toHaveAttribute('aria-pressed', 'true');
    });

    it('renders an OFF bell with the disable-explaining name', () => {
        renderWithProviders(
            <NotifyParticipantsCheckbox checked={false} onChange={vi.fn()} />
        );
        const btn = screen.getByRole('button', { name: OFF_LABEL });
        expect(btn).toHaveAttribute('aria-pressed', 'false');
    });

    it('toggles: clicking an ON bell reports the next (false) value', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <NotifyParticipantsCheckbox checked onChange={onChange} />
        );
        await userEvent.click(screen.getByRole('button', { name: ON_LABEL }));
        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('toggles: clicking an OFF bell reports the next (true) value', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <NotifyParticipantsCheckbox checked={false} onChange={onChange} />
        );
        await userEvent.click(screen.getByRole('button', { name: OFF_LABEL }));
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('uses a custom label as the accessible name when provided', () => {
        renderWithProviders(
            <NotifyParticipantsCheckbox
                checked
                onChange={vi.fn()}
                label="Alert my crew"
            />
        );
        expect(
            screen.getByRole('button', { name: 'Alert my crew' })
        ).toBeInTheDocument();
    });

    it('is inert when disabled', () => {
        const onChange = vi.fn();
        renderWithProviders(
            <NotifyParticipantsCheckbox
                checked
                onChange={onChange}
                disabled
            />
        );
        expect(screen.getByRole('button', { name: ON_LABEL })).toBeDisabled();
    });
});
