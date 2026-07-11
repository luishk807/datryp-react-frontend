import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import { TRIP_BASIC } from 'constants';
import type { TripState } from 'types';

const mockDispatch = vi.fn();
vi.mock('context/TripContext', () => ({
    useTripDispatch: () => mockDispatch,
    basicInfo: (payload: any) => ({ type: 'basicInfo', payload }),
}));

let mockUser: any;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isLoading: false }),
}));

let mockStatuses: any[];
vi.mock('api/hooks/useLookups', () => ({
    useTripStatuses: () => ({ data: mockStatuses }),
}));

vi.mock('hooks/useBudgetSuggestion', () => ({
    useBudgetSuggestion: () => ({
        suggestion: null,
        isLoading: false,
        inputMatchesAi: false,
    }),
}));

let searchBarProps: any;
vi.mock('components/SearchBar', () => ({
    default: (props: any) => {
        searchBarProps = props;
        return <div data-testid="searchbar" />;
    },
}));

vi.mock('components/BudgetSuggestionBadge', () => ({
    default: () => <div data-testid="budget-badge" />,
}));

let friendPickerProps: any;
vi.mock('../FriendPicker', () => ({
    default: (props: any) => {
        friendPickerProps = props;
        return <div data-testid="friend-picker" />;
    },
}));

let dropDownProps: any;
vi.mock('components/common/FormFields/DropDown', () => ({
    default: (props: any) => {
        dropDownProps = props;
        return <div data-testid="status-dropdown" data-disabled={String(props.disabled)} />;
    },
}));

import BasicInfo from './index';

const data = (over: Partial<TripState> = {}): TripState =>
    ({
        type: TRIP_BASIC.SINGLE,
        name: 'Tokyo',
        budget: '1000',
        startDate: '2026-08-01',
        endDate: '2026-08-05',
        organizer: [],
        destinations: [{ id: 1, country: { id: 1, name: 'Japan', code: 'JP' }, itinerary: [] }],
        status: { id: 's1', name: 'Planning' },
        ...over,
    }) as unknown as TripState;

beforeEach(() => {
    mockDispatch.mockReset();
    searchBarProps = undefined;
    friendPickerProps = undefined;
    dropDownProps = undefined;
    mockUser = { id: 'u1', travelerStyles: [], homeCountryCode: 'US', homeCity: 'NYC' };
    mockStatuses = [
        { id: 's1', name: 'Planning' },
        { id: 's2', name: 'Confirmed' },
    ];
});

describe('BasicInfo — layout by trip type', () => {
    it('single trip renders the country SearchBar and the header', () => {
        renderWithProviders(<BasicInfo onChange={vi.fn()} data={data()} />);
        expect(screen.getByText('Please enter basic info')).toBeInTheDocument();
        expect(screen.getByTestId('searchbar')).toBeInTheDocument();
    });

    it('multi trip with one country shows the "Next stop" destination card', () => {
        renderWithProviders(
            <BasicInfo
                onChange={vi.fn()}
                data={data({ type: TRIP_BASIC.MULTIPLE })}
            />
        );
        expect(screen.getByText('Next stop')).toBeInTheDocument();
        expect(screen.getByText('Japan')).toBeInTheDocument();
        expect(screen.queryByTestId('searchbar')).not.toBeInTheDocument();
    });

    it('multi trip with multiple countries shows "You\'re heading to" and joins them', () => {
        renderWithProviders(
            <BasicInfo
                onChange={vi.fn()}
                data={data({
                    type: TRIP_BASIC.MULTIPLE,
                    destinations: [
                        { id: 1, country: { id: 1, name: 'Japan' }, itinerary: [] },
                        { id: 2, country: { id: 2, name: 'Peru' }, itinerary: [] },
                    ] as any,
                })}
            />
        );
        expect(screen.getByText("You're heading to")).toBeInTheDocument();
        expect(screen.getByText('Japan • Peru')).toBeInTheDocument();
    });
});

describe('BasicInfo — field callbacks', () => {
    it('typing the trip name and budget bubbles up through onChange', () => {
        const onChange = vi.fn();
        renderWithProviders(<BasicInfo onChange={onChange} data={data()} />);
        fireEvent.change(screen.getByLabelText('Trip Name'), {
            target: { value: 'Kyoto Adventure' },
        });
        fireEvent.change(screen.getByLabelText('Budget'), {
            target: { value: '2500' },
        });
        expect(onChange.mock.calls.some((c) => c[0] === 'name')).toBe(true);
        expect(onChange.mock.calls.some((c) => c[0] === 'budget')).toBe(true);
    });

    it('seeds today into missing start/end dates on mount', () => {
        const onChange = vi.fn();
        renderWithProviders(
            <BasicInfo
                onChange={onChange}
                data={data({ startDate: undefined, endDate: undefined })}
            />
        );
        expect(onChange.mock.calls.some((c) => c[0] === 'startDate')).toBe(true);
        expect(onChange.mock.calls.some((c) => c[0] === 'endDate')).toBe(true);
    });

    it('the organizer picker forwards its selection under the organizer key', () => {
        const onChange = vi.fn();
        renderWithProviders(<BasicInfo onChange={onChange} data={data()} />);
        const evt = { target: { value: [{ id: 3, label: 'Ana', name: 'Ana' }] } };
        friendPickerProps.onChange('organizer', evt);
        expect(onChange).toHaveBeenCalledWith('organizer', evt);
    });

    it('selecting a country dispatches a destinations update to the trip context', () => {
        renderWithProviders(<BasicInfo onChange={vi.fn()} data={data()} />);
        searchBarProps.onSelected({ id: 9, name: 'Spain', code: 'ES' });
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'basicInfo' })
        );
        const payload = mockDispatch.mock.calls[0][0].payload;
        expect(payload.destinations[0].country).toEqual({
            id: 9,
            name: 'Spain',
            code: 'ES',
        });
    });
});

describe('BasicInfo — status field', () => {
    it('locks the status dropdown while creating (no apiId) and unlocks once saved', () => {
        const { rerender } = renderWithProviders(
            <BasicInfo onChange={vi.fn()} data={data({ apiId: undefined })} />
        );
        expect(dropDownProps.disabled).toBe(true);
        rerender(<BasicInfo onChange={vi.fn()} data={data({ apiId: 't1' })} />);
        expect(dropDownProps.disabled).toBe(false);
    });

    it('changing the status bubbles up under the status key', () => {
        const onChange = vi.fn();
        renderWithProviders(
            <BasicInfo onChange={onChange} data={data({ apiId: 't1' })} />
        );
        dropDownProps.onChange('s2');
        expect(onChange).toHaveBeenCalledWith('status', {
            target: { value: 's2' },
        });
    });

    it('resolves the current status by name from the lookup', () => {
        renderWithProviders(
            <BasicInfo
                onChange={vi.fn()}
                data={data({ apiId: 't1', status: { id: 's2', name: 'Confirmed' } as any })}
            />
        );
        expect(dropDownProps.value).toBe('s2');
    });
});
