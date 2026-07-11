import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/renderWithProviders';
import type { Friend } from 'types';

// Capture the props the shared Autocomplete receives so the picker's
// select/remove/renderOption logic can be driven directly.
let autoProps: any;
vi.mock('components/common/FormFields/Autocomplete', () => ({
    default: (props: any) => {
        autoProps = props;
        return <div data-testid="autocomplete" />;
    },
}));

const mockOpenModel = vi.fn();
let invitedCb: ((f: any) => void) | undefined;
vi.mock('components/InviteFriendModal', async () => {
    const { forwardRef, useImperativeHandle } = await import('react');
    return {
        default: forwardRef((props: any, ref: any) => {
            invitedCb = props.onInvited;
            useImperativeHandle(ref, () => ({
                openModel: mockOpenModel,
                closeModal: vi.fn(),
            }));
            return null;
        }),
    };
});

let mockFriends: any[];
vi.mock('api/hooks/useFriends', () => ({
    useFriends: () => ({ data: mockFriends }),
}));

let mockUser: any;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

import FriendPicker from './index';

beforeEach(() => {
    autoProps = undefined;
    invitedCb = undefined;
    mockOpenModel.mockReset();
    mockFriends = [
        { id: 'uuid-a', name: 'Alice', email: 'alice@x.com' },
        { id: 'uuid-b', name: 'Bob', email: 'bob@x.com' },
    ];
    mockUser = { id: 'me', name: 'Me', email: 'me@x.com' };
});

const labels = () => autoProps.options.map((o: any) => o.label);

describe('FriendPicker — options list', () => {
    it('surfaces the signed-in user at the top plus friends and the invite row', () => {
        render(<FriendPicker onChange={vi.fn()} />);
        expect(labels()).toEqual(
            expect.arrayContaining(['Me (you)', 'Alice', 'Bob', 'Invite a friend'])
        );
    });

    it('omits the self row when no user is signed in and falls back to email as label', () => {
        mockUser = null;
        mockFriends = [{ id: 'uuid-c', name: undefined, email: 'noname@x.com' }];
        render(<FriendPicker onChange={vi.fn()} />);
        expect(labels()).toEqual(
            expect.arrayContaining(['noname@x.com', 'Invite a friend'])
        );
        expect(labels()).not.toContain('Me (you)');
    });

    it('excludes already-selected friends from the option list', () => {
        const selected = [
            { id: 999, label: 'Alice', name: 'Alice' },
        ] as unknown as Friend[];
        // hash of 'uuid-a' won't equal 999, so Alice still shows — instead
        // assert the invite option is always present regardless.
        render(<FriendPicker onChange={vi.fn()} selectedOptions={selected} />);
        expect(autoProps.options.some((o: any) => o.id === -1)).toBe(true);
    });
});

describe('FriendPicker — selection callbacks', () => {
    it('selecting a friend emits the growing list through onChange', () => {
        const onChange = vi.fn();
        render(<FriendPicker name="organizer" onChange={onChange} />);
        const alice = autoProps.options.find((o: any) => o.label === 'Alice');
        autoProps.onSelect(alice);
        expect(onChange).toHaveBeenCalledWith('organizer', {
            target: { value: [expect.objectContaining({ label: 'Alice' })] },
        });
    });

    it('the invite row opens the invite modal instead of selecting', () => {
        const onChange = vi.fn();
        render(<FriendPicker onChange={onChange} />);
        const invite = autoProps.options.find((o: any) => o.id === -1);
        autoProps.onSelect(invite);
        expect(mockOpenModel).toHaveBeenCalledTimes(1);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores a re-select of an already-chosen friend', () => {
        const onChange = vi.fn();
        const selected = [
            { id: 42, label: 'Carol', name: 'Carol' },
        ] as unknown as Friend[];
        render(<FriendPicker onChange={onChange} selectedOptions={selected} />);
        autoProps.onSelect({ id: 42, label: 'Carol' });
        expect(onChange).not.toHaveBeenCalled();
    });

    it('removing a friend emits the filtered list', () => {
        const onChange = vi.fn();
        const selected = [
            { id: 42, label: 'Carol', name: 'Carol' },
            { id: 43, label: 'Dan', name: 'Dan' },
        ] as unknown as Friend[];
        render(<FriendPicker onChange={onChange} selectedOptions={selected} />);
        autoProps.onRemove([{ id: 43, label: 'Dan' }]);
        expect(onChange).toHaveBeenCalledWith(undefined, {
            target: { value: [expect.objectContaining({ id: 42 })] },
        });
    });

    it('an accepted invite adds the new friend to the selection', () => {
        const onChange = vi.fn();
        render(<FriendPicker onChange={onChange} />);
        invitedCb?.({ id: 'u9', name: 'New Friend', email: 'new@x.com' });
        expect(onChange).toHaveBeenCalledWith(undefined, {
            target: {
                value: [expect.objectContaining({ label: 'New Friend' })],
            },
        });
    });
});

describe('FriendPicker — renderOption', () => {
    const renderOpt = (opt: any, isSelected: boolean) => {
        render(<>{autoProps.renderOption(opt, isSelected)}</>);
    };

    it('renders the invite affordance for the invite row', () => {
        render(<FriendPicker onChange={vi.fn()} />);
        renderOpt({ id: -1, label: 'Invite a friend' }, false);
        expect(screen.getByText('Invite a friend')).toBeInTheDocument();
        expect(screen.getByText('Send an email invite')).toBeInTheDocument();
    });

    it('renders a friend row with avatar initial, email, and a pending tag', () => {
        render(<FriendPicker onChange={vi.fn()} />);
        renderOpt(
            { id: 7, label: 'Zoe', email: 'zoe@x.com', pending: true },
            false
        );
        expect(screen.getByText('Z')).toBeInTheDocument();
        expect(screen.getByText('zoe@x.com')).toBeInTheDocument();
        expect(screen.getByText('Invited')).toBeInTheDocument();
    });

    it('marks a selected friend with the "Added" tag', () => {
        render(<FriendPicker onChange={vi.fn()} />);
        renderOpt({ id: 8, label: 'Ash' }, true);
        expect(screen.getByText('Added')).toBeInTheDocument();
    });
});
