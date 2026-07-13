import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { PassportCountry } from 'hooks/usePassportCountry';
import type { CountryResult } from 'api/hooks/useCountries';
import type { VisaInfo } from 'types';

let mockPassport: PassportCountry | null = null;
let mockPassportLoading = false;
vi.mock('hooks/usePassportCountry', () => ({
    usePassportCountry: () => ({
        data: mockPassport,
        isLoading: mockPassportLoading,
    }),
}));

const mockMutate = vi.fn();
vi.mock('api/hooks/useMyPreferences', () => ({
    useUpdateMyPreferences: () => ({ mutate: mockMutate, isPending: false }),
}));

let mockCountries: CountryResult[] = [];
vi.mock('api/hooks/useCountries', () => ({
    useCountries: () => ({ data: mockCountries, isFetching: false }),
}));

let mockUser: { id: string } | null = null;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

import VisaWidget from './index';

const visa: VisaInfo = {
    destinationCountryCode: 'FR',
    visaFreeCountries: ['US', 'CA'],
    visaOnArrivalCountries: ['IN'],
    summary: 'Most passports enter France visa-free for 90 days.',
};

const passport = (code: string): PassportCountry => ({
    code,
    source: 'passport',
});

beforeEach(() => {
    mockPassport = null;
    mockPassportLoading = false;
    mockCountries = [];
    mockUser = null;
    mockMutate.mockReset();
});

describe('VisaWidget — status resolution', () => {
    it('flags a visa-free passport', () => {
        mockPassport = passport('US');
        const { container } = renderWithProviders(<VisaWidget visa={visa} />);
        expect(screen.getByText('Visa-free entry')).toBeInTheDocument();
        expect(
            screen.getByText(/For United States passport/)
        ).toBeInTheDocument();
        expect(container.querySelector('.status-visa-free')).toBeInTheDocument();
        expect(screen.getByText(visa.summary)).toBeInTheDocument();
    });

    it('renders the passport flag as decorative (name is already in the text)', () => {
        mockPassport = passport('US');
        const { container } = renderWithProviders(<VisaWidget visa={visa} />);
        const flag = container.querySelector('.visa-widget-flag');
        // "For United States passport" already carries the country name, so the
        // adjacent flag is hidden from the a11y tree.
        expect(flag).toHaveAttribute('alt', '');
        expect(flag).toHaveAttribute('aria-hidden', 'true');
    });

    it('flags the traveler as a citizen when the passport matches the destination', () => {
        mockPassport = passport('FR');
        const { container } = renderWithProviders(<VisaWidget visa={visa} />);
        expect(screen.getByText("You're a citizen")).toBeInTheDocument();
        expect(container.querySelector('.status-citizen')).toBeInTheDocument();
    });

    it('flags a visa-on-arrival passport', () => {
        mockPassport = passport('IN');
        renderWithProviders(<VisaWidget visa={visa} />);
        expect(screen.getByText('Visa on arrival')).toBeInTheDocument();
    });

    it('flags a visa-required passport', () => {
        mockPassport = passport('BR');
        const { container } = renderWithProviders(<VisaWidget visa={visa} />);
        expect(screen.getByText('Visa required')).toBeInTheDocument();
        expect(
            container.querySelector('.status-visa-required')
        ).toBeInTheDocument();
    });

    it('shows a detecting state while the passport is still loading', () => {
        mockPassport = null;
        mockPassportLoading = true;
        renderWithProviders(<VisaWidget visa={visa} />);
        expect(
            screen.getByText('Detecting your location…')
        ).toBeInTheDocument();
    });
});

describe('VisaWidget — passport picker', () => {
    it('opens the picker from "Change" when a passport is known', async () => {
        mockPassport = passport('US');
        renderWithProviders(<VisaWidget visa={visa} />);
        expect(
            screen.queryByPlaceholderText('Select your passport country')
        ).not.toBeInTheDocument();

        // Self-contained accessible name (bare "Change" is meaningless to a
        // screen reader) that says what it changes + the current country.
        const change = screen.getByRole('button', {
            name: /change passport country, currently united states/i,
        });
        expect(change).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(change);
        expect(
            screen.getByPlaceholderText('Select your passport country')
        ).toBeInTheDocument();
        expect(change).toHaveAttribute('aria-expanded', 'true');
    });

    it('offers "Add your passport country" and opens the picker when none is set', async () => {
        mockPassport = null;
        mockPassportLoading = false;
        renderWithProviders(<VisaWidget visa={visa} />);
        expect(screen.getByText('Check visa requirements')).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: /add your passport country/i })
        );
        expect(
            screen.getByPlaceholderText('Select your passport country')
        ).toBeInTheDocument();
    });
});
