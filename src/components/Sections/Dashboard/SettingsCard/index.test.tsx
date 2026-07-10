import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';

vi.mock('./FreeEverythingCard', () => ({
    default: () => <div data-testid="free-everything" />,
}));
vi.mock('./MaintenanceCard', () => ({
    default: () => <div data-testid="maintenance" />,
}));
vi.mock('./SmsCard', () => ({
    default: () => <div data-testid="sms" />,
}));

import SettingsCard from './index';

describe('SettingsCard', () => {
    it('composes the three settings cards', () => {
        renderWithProviders(<SettingsCard />);
        expect(screen.getByTestId('free-everything')).toBeInTheDocument();
        expect(screen.getByTestId('maintenance')).toBeInTheDocument();
        expect(screen.getByTestId('sms')).toBeInTheDocument();
    });
});
