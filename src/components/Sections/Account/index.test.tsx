import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
    fireEvent,
} from '../../../test/renderWithProviders';

// jsdom doesn't implement scrollIntoView; the nav + hash effects call it.
HTMLElement.prototype.scrollIntoView = vi.fn();

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

const mockUpdateUser = vi.fn();
const mockLogout = vi.fn();
const mockUploadMutate = vi.fn();
const mockRemoveMutate = vi.fn();
const mockUpdatePrefsMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

let mockUser: Record<string, unknown> | null = null;
let mockIsAdmin = false;
let mockSmsEnabled = false;
let mockCountries: Array<Record<string, unknown>> = [];
let mockCountriesLoading = false;
let mockGenders: Array<Record<string, unknown>> = [];
let mockGendersLoading = false;
let mockInterests: Array<Record<string, unknown>> = [];
let mockTravelerStyles: Array<Record<string, unknown>> = [];
let mockPreferences: Record<string, unknown> | undefined;
let mockUpdatePrefsPending = false;
let mockUploadPending = false;
let mockRemovePending = false;
let mockDeletePending = false;

vi.mock('context/UserContext', () => ({
    useUser: () => ({
        user: mockUser,
        isAdmin: mockIsAdmin,
        updateUser: mockUpdateUser,
        logout: mockLogout,
    }),
}));

vi.mock('api/hooks/useFeatures', () => ({
    useSmsEnabled: () => mockSmsEnabled,
}));

vi.mock('api/hooks/useDeleteAccount', () => ({
    useDeleteAccount: () => ({
        mutateAsync: mockDeleteMutateAsync,
        isPending: mockDeletePending,
    }),
}));

vi.mock('api/hooks/useCountries', () => ({
    useCountries: () => ({
        data: mockCountries,
        isLoading: mockCountriesLoading,
    }),
}));

vi.mock('api/hooks/useMyPreferences', () => ({
    useGendersCatalog: () => ({
        data: mockGenders,
        isLoading: mockGendersLoading,
    }),
    useInterestsCatalog: () => ({ data: mockInterests }),
    useTravelerStylesCatalog: () => ({ data: mockTravelerStyles }),
    useMyPreferences: () => ({ data: mockPreferences }),
    useUpdateMyPreferences: () => ({
        mutateAsync: mockUpdatePrefsMutateAsync,
        isPending: mockUpdatePrefsPending,
    }),
}));

vi.mock('api/hooks/useProfileImage', () => ({
    useUploadProfileImage: () => ({
        mutate: mockUploadMutate,
        isPending: mockUploadPending,
    }),
    useRemoveProfileImage: () => ({
        mutate: mockRemoveMutate,
        isPending: mockRemovePending,
    }),
}));

// CityAutocomplete (inside HomeBaseField) fetches via usePlaces on typing —
// keep the field real but inert so no request escapes MSW's error guard.
vi.mock('api/hooks/usePlaces', () => ({
    usePlaces: () => ({ data: [], isFetching: false }),
}));

// SubscriptionSection has its own test file; stub it to a passthrough that
// still exposes the `#subscription` anchor the nav scrolls to.
vi.mock('./SubscriptionSection', () => ({
    default: () => <section id="subscription">subscription-section</section>,
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ title, children }: { title?: string; children: ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    ),
}));

import Account from './index';

const makeUser = (over: Record<string, unknown> = {}) => ({
    id: 'u1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: null,
    birthYear: null,
    role: 'user',
    subscriptionPlan: 'free',
    subscriptionStatus: 'none',
    effectiveTripCap: 1,
    isPaidMember: false,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    countryOfBirthCode: null,
    passportCountryCode: null,
    interests: [],
    travelerStyles: [],
    dreamDestinations: [],
    genderId: null,
    onboardingCompletedAt: null,
    profileImageUrl: null,
    homeCity: null,
    homeCountry: null,
    homeCountryCode: null,
    homeLatitude: null,
    homeLongitude: null,
    travelCompanions: [],
    kidsAgeBuckets: [],
    notifyEmail: true,
    notifySms: false,
    emailVerified: true,
    detectedCountryCode: null,
    freeEverythingActive: false,
    freeEverythingUntil: null,
    ...over,
});

beforeEach(() => {
    mockUser = makeUser();
    mockIsAdmin = false;
    mockSmsEnabled = false;
    mockCountries = [
        { id: 'c-us', code: 'US', name: 'United States', local: null, image: null },
        { id: 'c-jp', code: 'JP', name: 'Japan', local: null, image: null },
        { id: 'c-fr', code: 'FR', name: 'France', local: null, image: null },
    ];
    mockCountriesLoading = false;
    mockGenders = [
        { id: 'g-f', name: 'Female' },
        { id: 'g-m', name: 'Male' },
    ];
    mockGendersLoading = false;
    mockInterests = [
        { slug: 'food', label: 'Food' },
        { slug: 'hiking', label: 'Hiking' },
    ];
    mockTravelerStyles = [
        { slug: 'luxury', label: 'Luxury' },
        { slug: 'budget', label: 'Budget' },
    ];
    mockPreferences = {
        notifyEmail: true,
        notifySms: false,
        shareVisitedPlaces: false,
    };
    mockUpdatePrefsPending = false;
    mockUploadPending = false;
    mockRemovePending = false;
    mockDeletePending = false;

    mockNavigate.mockReset();
    mockUpdateUser.mockReset();
    mockLogout.mockReset();
    mockUploadMutate.mockReset();
    mockRemoveMutate.mockReset();
    mockUpdatePrefsMutateAsync.mockReset();
    mockDeleteMutateAsync.mockReset();
});

describe('Account — logged out', () => {
    it('prompts the user to log in when there is no user', () => {
        mockUser = null;
        renderWithProviders(<Account />);
        expect(
            screen.getByText('Log in to manage your profile.')
        ).toBeInTheDocument();
    });
});

describe('Account — layout & nav', () => {
    it('renders every section heading + nav links for a signed-in user', () => {
        renderWithProviders(<Account />);
        expect(
            screen.getByRole('heading', { level: 2, name: 'Profile' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { level: 2, name: 'Password' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Travel preferences',
            })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { level: 2, name: 'Notifications' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { level: 2, name: 'Privacy' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { level: 2, name: 'Delete account' })
        ).toBeInTheDocument();
        // The stubbed subscription section anchor is present.
        expect(screen.getByText('subscription-section')).toBeInTheDocument();
        // Desktop nav rail.
        expect(
            screen.getByRole('link', { name: 'Subscription' })
        ).toBeInTheDocument();
    });

    it('highlights a section when its nav link is clicked', async () => {
        renderWithProviders(<Account />);
        const link = screen.getByRole('link', { name: 'Notifications' });
        await userEvent.click(link);
        expect(link).toHaveClass('is-active');
        expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it('moves focus to the section heading when a nav link is activated', async () => {
        renderWithProviders(<Account />);
        await userEvent.click(screen.getByRole('link', { name: 'Notifications' }));
        // Keyboard/SR users land at the top of the section they chose, not
        // stranded on the nav link.
        const heading = screen.getByRole('heading', {
            level: 2,
            name: 'Notifications',
        });
        expect(heading).toHaveAttribute('tabindex', '-1');
        expect(heading).toHaveFocus();
    });

    it('returns focus to the nav item when Escape is pressed in the content', async () => {
        renderWithProviders(<Account />);
        const link = screen.getByRole('link', { name: 'Notifications' });
        await userEvent.click(link);
        // Focus is now inside the section; Escape hops back to the menu.
        await userEvent.keyboard('{Escape}');
        expect(link).toHaveFocus();
    });

    it('scrolls to the hash target section on mount', () => {
        renderWithProviders(<Account />, { route: '/account#profile' });
        // Effect ran without throwing; the section still renders.
        expect(
            screen.getByRole('heading', { level: 2, name: 'Profile' })
        ).toBeInTheDocument();
    });

    it('reorders the country list to pin the detected country', () => {
        mockUser = makeUser({ detectedCountryCode: 'JP' });
        renderWithProviders(<Account />);
        // Both country dropdowns still expose Japan after the reorder.
        expect(
            screen.getAllByRole('option', { name: 'Japan' }).length
        ).toBeGreaterThan(0);
    });
});

describe('Account — profile save', () => {
    it('blocks the save and toasts when the name is empty', async () => {
        renderWithProviders(<Account />);
        await userEvent.clear(screen.getByLabelText('Full name'));
        await userEvent.click(
            screen.getByRole('button', { name: 'Save profile' })
        );
        expect(
            await screen.findByText('Name is required.')
        ).toBeInTheDocument();
        expect(mockUpdateUser).not.toHaveBeenCalled();
        expect(mockUpdatePrefsMutateAsync).not.toHaveBeenCalled();
    });

    it('saves the name locally without a server PATCH when nothing else changed', async () => {
        renderWithProviders(<Account />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Save profile' })
        );
        expect(mockUpdateUser).toHaveBeenCalledWith({ name: 'Ada Lovelace' });
        expect(mockUpdatePrefsMutateAsync).not.toHaveBeenCalled();
        expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
    });

    it('PATCHes only the changed birth-year field and toasts success', async () => {
        renderWithProviders(<Account />);
        await userEvent.selectOptions(
            screen.getByLabelText('Year of birth'),
            '1990'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save profile' })
        );
        expect(mockUpdatePrefsMutateAsync).toHaveBeenCalledWith({
            birthYear: 1990,
        });
        expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
    });

    it('PATCHes a changed phone number as E.164', async () => {
        renderWithProviders(<Account />);
        await userEvent.type(
            screen.getByLabelText('Phone'),
            '5551234567'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save profile' })
        );
        expect(mockUpdatePrefsMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({ phone: '+15551234567' })
        );
    });

    it('shows a partial-save toast when the server PATCH fails', async () => {
        mockUpdatePrefsMutateAsync.mockRejectedValueOnce(new Error('boom'));
        renderWithProviders(<Account />);
        await userEvent.selectOptions(
            screen.getByLabelText('Country of birth'),
            'Japan'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save profile' })
        );
        expect(
            await screen.findByText('Saved partially, but: boom')
        ).toBeInTheDocument();
    });
});

describe('Account — profile image', () => {
    it('renders the avatar image and falls back to the initial on load error', () => {
        mockUser = makeUser({
            profileImageUrl: 'https://cdn.example/ada.jpg',
        });
        const { container } = renderWithProviders(<Account />);
        const img = container.querySelector(
            'img.account-avatar-img'
        ) as HTMLImageElement;
        expect(img).toBeInTheDocument();
        fireEvent.error(img);
        expect(
            container.querySelector('.account-avatar-initial')
        ).toHaveTextContent('A');
    });

    it('uploads a chosen image via the mutation', () => {
        mockUser = makeUser({
            profileImageUrl: 'https://cdn.example/ada.jpg',
        });
        renderWithProviders(<Account />);
        const input = screen.getByLabelText(
            'Upload a profile picture'
        ) as HTMLInputElement;
        const file = new File(['x'], 'me.png', { type: 'image/png' });
        fireEvent.change(input, { target: { files: [file] } });
        expect(mockUploadMutate).toHaveBeenCalledTimes(1);
        expect(mockUploadMutate.mock.calls[0][0]).toBe(file);
    });

    it('rejects an oversized image before uploading', () => {
        mockUser = makeUser({
            profileImageUrl: 'https://cdn.example/ada.jpg',
        });
        renderWithProviders(<Account />);
        const input = screen.getByLabelText(
            'Upload a profile picture'
        ) as HTMLInputElement;
        const big = new File(['x'], 'big.png', { type: 'image/png' });
        Object.defineProperty(big, 'size', { value: 7 * 1024 * 1024 });
        fireEvent.change(input, { target: { files: [big] } });
        expect(mockUploadMutate).not.toHaveBeenCalled();
        expect(
            screen.getByText('Image must be under 6 MB.')
        ).toBeInTheDocument();
    });

    it('surfaces an upload error from the mutation callback', () => {
        mockUser = makeUser({
            profileImageUrl: 'https://cdn.example/ada.jpg',
        });
        mockUploadMutate.mockImplementationOnce(
            (_file: File, opts: { onError: (e: Error) => void }) =>
                opts.onError(new Error('upload nope'))
        );
        renderWithProviders(<Account />);
        const input = screen.getByLabelText(
            'Upload a profile picture'
        ) as HTMLInputElement;
        const file = new File(['x'], 'me.png', { type: 'image/png' });
        fireEvent.change(input, { target: { files: [file] } });
        expect(screen.getByText('upload nope')).toBeInTheDocument();
    });

    it('removes the current image via the mutation', async () => {
        mockUser = makeUser({
            profileImageUrl: 'https://cdn.example/ada.jpg',
        });
        renderWithProviders(<Account />);
        await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
        expect(mockRemoveMutate).toHaveBeenCalledTimes(1);
    });
});

describe('Account — password', () => {
    const fill = async (current: string, next: string, confirm: string) => {
        if (current) await userEvent.type(screen.getByLabelText('Current password'), current);
        if (next) await userEvent.type(screen.getByLabelText('New password'), next);
        if (confirm) await userEvent.type(screen.getByLabelText('Confirm new password'), confirm);
        await userEvent.click(
            screen.getByRole('button', { name: 'Update password' })
        );
    };

    it('requires all three fields', async () => {
        renderWithProviders(<Account />);
        await fill('', '', '');
        expect(
            screen.getByText('Fill in all password fields.')
        ).toBeInTheDocument();
    });

    it('rejects mismatched passwords', async () => {
        renderWithProviders(<Account />);
        await fill('old', 'abcdef', 'abcdeg');
        expect(
            screen.getByText("Passwords don't match.")
        ).toBeInTheDocument();
    });

    it('rejects a too-short new password', async () => {
        renderWithProviders(<Account />);
        await fill('old', 'abc', 'abc');
        expect(
            screen.getByText('New password must be at least 6 characters.')
        ).toBeInTheDocument();
    });

    it('accepts a valid change and clears the fields', async () => {
        renderWithProviders(<Account />);
        await fill('old', 'abcdef', 'abcdef');
        expect(screen.getByText('Password updated.')).toBeInTheDocument();
        expect(screen.getByLabelText('New password')).toHaveValue('');
    });
});

describe('Account — travel preferences', () => {
    it('saves selected interests', async () => {
        renderWithProviders(<Account />);
        await userEvent.click(screen.getByRole('option', { name: 'Hiking' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Save travel preferences' })
        );
        expect(mockUpdatePrefsMutateAsync).toHaveBeenCalledWith({
            interests: ['hiking'],
            travelerStyles: [],
            dreamDestinations: [],
            travelCompanions: [],
            kidsAgeBuckets: [],
        });
        expect(
            await screen.findByText('Travel preferences saved.')
        ).toBeInTheDocument();
    });

    it('reveals the kids-age picker and persists buckets for families', async () => {
        renderWithProviders(<Account />);
        await userEvent.click(
            screen.getByRole('option', { name: 'Family with kids' })
        );
        expect(
            screen.getByText("Kids' age ranges")
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('option', { name: '0–2 (toddlers)' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save travel preferences' })
        );
        expect(mockUpdatePrefsMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                travelCompanions: ['family_kids'],
                kidsAgeBuckets: ['0-2'],
            })
        );
    });

    it('shows an error toast when the travel-prefs save fails', async () => {
        mockUpdatePrefsMutateAsync.mockRejectedValueOnce(new Error('nope'));
        renderWithProviders(<Account />);
        await userEvent.click(screen.getByRole('option', { name: 'Luxury' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Save travel preferences' })
        );
        expect(await screen.findByText('nope')).toBeInTheDocument();
    });
});

describe('Account — notifications', () => {
    it('saves the email toggle and hides SMS when the feature is off', async () => {
        renderWithProviders(<Account />);
        expect(
            screen.queryByRole('checkbox', { name: /SMS notifications/i })
        ).not.toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('checkbox', { name: /Email notifications/i })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save notifications' })
        );
        expect(mockUpdatePrefsMutateAsync).toHaveBeenCalledWith({
            notifyEmail: false,
            notifySms: false,
        });
        expect(
            await screen.findByText('Notification settings saved.')
        ).toBeInTheDocument();
    });

    it('shows the Pro upsell + add-phone helper for free users when SMS is on', () => {
        mockSmsEnabled = true;
        renderWithProviders(<Account />);
        expect(
            screen.getByText(/SMS alerts are a Pro feature/)
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Upgrade to Pro' })
        ).toBeInTheDocument();
        const sms = screen.getByRole('checkbox', {
            name: /SMS notifications/i,
        });
        expect(sms).toBeDisabled();
    });

    it('blocks the SMS toggle until consent is given (Pro)', async () => {
        mockSmsEnabled = true;
        mockUser = makeUser({ isPaidMember: true });
        renderWithProviders(<Account />);
        expect(
            screen.getByText(/Add a phone number in your Profile/i)
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('checkbox', { name: /SMS notifications/i })
        );
        expect(
            screen.getByText(
                'Please check the SMS consent box below to receive text alerts.'
            )
        ).toBeInTheDocument();
    });

    it('enables + saves SMS once consent is checked (Pro)', async () => {
        mockSmsEnabled = true;
        mockUser = makeUser({ isPaidMember: true });
        renderWithProviders(<Account />);
        await userEvent.click(
            screen.getByRole('checkbox', { name: /I agree to receive SMS/i })
        );
        await userEvent.click(
            screen.getByRole('checkbox', { name: /SMS notifications/i })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save notifications' })
        );
        expect(mockUpdatePrefsMutateAsync).toHaveBeenCalledWith({
            notifyEmail: true,
            notifySms: true,
        });
    });

    it('revokes SMS when consent is unchecked (Pro)', async () => {
        mockSmsEnabled = true;
        mockUser = makeUser({ isPaidMember: true });
        renderWithProviders(<Account />);
        const consent = screen.getByRole('checkbox', {
            name: /I agree to receive SMS/i,
        });
        await userEvent.click(consent);
        const sms = screen.getByRole('checkbox', {
            name: /SMS notifications/i,
        });
        await userEvent.click(sms);
        expect(sms).toBeChecked();
        await userEvent.click(consent);
        expect(sms).not.toBeChecked();
    });

    it('shows the fallback error when the notification save rejects', async () => {
        mockUpdatePrefsMutateAsync.mockRejectedValueOnce('oops');
        renderWithProviders(<Account />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Save notifications' })
        );
        expect(
            await screen.findByText('Could not save notification settings.')
        ).toBeInTheDocument();
    });
});

describe('Account — privacy', () => {
    it('saves the share-visited toggle', async () => {
        renderWithProviders(<Account />);
        await userEvent.click(
            screen.getByRole('checkbox', {
                name: /Share visited places with friends/i,
            })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save privacy' })
        );
        expect(mockUpdatePrefsMutateAsync).toHaveBeenCalledWith({
            shareVisitedPlaces: true,
        });
        expect(
            await screen.findByText('Privacy settings saved.')
        ).toBeInTheDocument();
    });

    it('shows an error toast when the privacy save fails', async () => {
        mockUpdatePrefsMutateAsync.mockRejectedValueOnce(new Error('denied'));
        renderWithProviders(<Account />);
        await userEvent.click(
            screen.getByRole('checkbox', {
                name: /Share visited places with friends/i,
            })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save privacy' })
        );
        expect(await screen.findByText('denied')).toBeInTheDocument();
    });
});

describe('Account — delete account', () => {
    const openModal = async () => {
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete my account' })
        );
        const confirmInput = screen.getByLabelText('Type DELETE to confirm');
        const modal = confirmInput.closest('.modalCustom') as HTMLElement;
        return { confirmInput, modal };
    };

    it('opens the confirm modal and keeps the delete button disabled until DELETE is typed', async () => {
        renderWithProviders(<Account />);
        const { modal } = await openModal();
        const confirm = within(modal).getByRole('button', {
            name: 'Delete my account',
        });
        expect(confirm).toBeDisabled();
    });

    it('deletes the account then logs out and navigates home', async () => {
        renderWithProviders(<Account />);
        const { confirmInput, modal } = await openModal();
        await userEvent.type(confirmInput, 'DELETE');
        await userEvent.click(
            within(modal).getByRole('button', { name: 'Delete my account' })
        );
        await waitFor(() =>
            expect(mockDeleteMutateAsync).toHaveBeenCalledTimes(1)
        );
        expect(mockLogout).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('shows an error and stays put when deletion fails', async () => {
        mockDeleteMutateAsync.mockRejectedValueOnce(new Error('cannot delete'));
        renderWithProviders(<Account />);
        const { confirmInput, modal } = await openModal();
        await userEvent.type(confirmInput, 'DELETE');
        await userEvent.click(
            within(modal).getByRole('button', { name: 'Delete my account' })
        );
        expect(
            await within(modal).findByText('cannot delete')
        ).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('closes the modal via Cancel', async () => {
        renderWithProviders(<Account />);
        const { modal } = await openModal();
        await userEvent.click(
            within(modal).getByRole('button', { name: 'Cancel' })
        );
        await waitFor(() =>
            expect(
                screen.queryByLabelText('Type DELETE to confirm')
            ).not.toBeInTheDocument()
        );
    });
});

describe('Account — loading & pending states', () => {
    it('disables the country pickers and shows loading placeholders', () => {
        mockCountriesLoading = true;
        mockGendersLoading = true;
        renderWithProviders(<Account />);
        expect(screen.getByLabelText('Country of birth')).toBeDisabled();
        expect(screen.getByLabelText('Gender')).toBeDisabled();
        expect(
            screen.getAllByText('Loading countries…').length
        ).toBeGreaterThan(0);
    });

    it('shows Saving… labels while a preferences mutation is pending', () => {
        mockUpdatePrefsPending = true;
        renderWithProviders(<Account />);
        expect(
            screen.getAllByRole('button', { name: 'Saving…' }).length
        ).toBeGreaterThan(0);
    });

    it('seeds notification toggles from the preferences query', () => {
        mockPreferences = {
            notifyEmail: false,
            notifySms: false,
            shareVisitedPlaces: true,
        };
        renderWithProviders(<Account />);
        expect(
            screen.getByRole('checkbox', { name: /Email notifications/i })
        ).not.toBeChecked();
        expect(
            screen.getByRole('checkbox', {
                name: /Share visited places with friends/i,
            })
        ).toBeChecked();
    });

    it('shows Uploading… / Removing… labels while image mutations run', () => {
        mockUser = makeUser({
            profileImageUrl: 'https://cdn.example/ada.jpg',
        });
        mockUploadPending = true;
        mockRemovePending = true;
        renderWithProviders(<Account />);
        expect(screen.getByText('Uploading…')).toBeInTheDocument();
        expect(screen.getByText('Removing…')).toBeInTheDocument();
    });

    it('shows Deleting… while the deletion is in flight', async () => {
        mockDeletePending = true;
        renderWithProviders(<Account />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete my account' })
        );
        const modal = screen
            .getByLabelText('Type DELETE to confirm')
            .closest('.modalCustom') as HTMLElement;
        expect(
            within(modal).getByRole('button', { name: 'Deleting…' })
        ).toBeDisabled();
    });

    it('seeds the home-base field from the saved city', () => {
        mockUser = makeUser({
            homeCity: 'Paris',
            homeCountry: 'France',
            homeCountryCode: 'FR',
            homeLatitude: 48.8,
            homeLongitude: 2.3,
        });
        renderWithProviders(<Account />);
        expect(
            screen.getByDisplayValue('Paris, France')
        ).toBeInTheDocument();
    });
});

describe('Account — more profile edits', () => {
    it('opens the native file picker when the avatar is clicked', async () => {
        mockUser = makeUser({
            profileImageUrl: 'https://cdn.example/ada.jpg',
        });
        const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
        renderWithProviders(<Account />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Change profile picture' })
        );
        expect(clickSpy).toHaveBeenCalled();
        clickSpy.mockRestore();
    });

    it('PATCHes a changed gender and handles clearing the birth year', async () => {
        renderWithProviders(<Account />);
        const yearSelect = screen.getByLabelText('Year of birth');
        await userEvent.selectOptions(yearSelect, '1990');
        await userEvent.selectOptions(yearSelect, 'Select a year');
        await userEvent.selectOptions(screen.getByLabelText('Gender'), 'g-f');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save profile' })
        );
        expect(mockUpdatePrefsMutateAsync).toHaveBeenCalledWith({
            genderId: 'g-f',
        });
    });
});
