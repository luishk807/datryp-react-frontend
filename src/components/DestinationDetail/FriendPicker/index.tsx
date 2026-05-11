import { useEffect, useMemo, useState } from 'react';
import './index.css';
import { Grid } from '@mui/material';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import Autocomplete, {
    type AutocompleteOption,
} from 'components/common/FormFields/Autocomplete';
import InviteFriendModal from 'components/InviteFriendModal';
import { useUser, type UserFriend } from 'context/UserContext';
import type { Friend } from 'types';

const ADD_FRIEND_OPTION_ID = -1;

interface FriendOption extends AutocompleteOption {
    email?: string;
    pending?: boolean;
}

interface FriendPickerProps {
    onChange: (
        name: string | undefined,
        e: { target: { value: Friend[] } }
    ) => void;
    title?: string;
    name?: string;
    isMultiple?: boolean;
    selectedOptions?: Friend[];
}

const hashId = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return h;
};

const toOption = (f: UserFriend): FriendOption => ({
    id: Number.isFinite(Number(f.id)) ? Number(f.id) : Math.abs(hashId(f.id)),
    label: f.name,
    email: f.email,
    pending: f.pending,
});

const FriendPicker = ({
    onChange,
    title = 'friends',
    name,
    isMultiple = true,
    selectedOptions = [],
}: FriendPickerProps) => {
    const { user } = useUser();
    const userFriends = useMemo(() => user?.friends ?? [], [user?.friends]);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [selectedFriendList, setSelectedFriendList] =
        useState<Friend[]>(selectedOptions);

    useEffect(() => {
        setSelectedFriendList(selectedOptions);
    }, [selectedOptions]);

    const optionList = useMemo<FriendOption[]>(() => {
        const selectedIds = new Set(selectedFriendList.map((f) => f.id));
        const list: FriendOption[] = userFriends
            .map(toOption)
            .filter((o) => !selectedIds.has(o.id));
        list.push({ id: ADD_FRIEND_OPTION_ID, label: 'Invite a friend' });
        return list;
    }, [userFriends, selectedFriendList]);

    const selectFriend = (option: FriendOption) => {
        if (selectedFriendList.some((f) => f.id === option.id)) return;
        const next: Friend[] = [
            ...selectedFriendList,
            { id: option.id, label: option.label, name: option.label },
        ];
        setSelectedFriendList(next);
        onChange(name, { target: { value: next } });
    };

    const handleOnSelect = (e: FriendOption) => {
        if (e.id === ADD_FRIEND_OPTION_ID) {
            setInviteOpen(true);
            return;
        }
        selectFriend(e);
    };

    const handleOnRemove = (remaining: FriendOption[]) => {
        const ids = new Set(remaining.map((r) => r.id));
        const next = selectedFriendList.filter((f) => !ids.has(f.id));
        setSelectedFriendList(next);
        onChange(name, { target: { value: next } });
    };

    const handleInvited = (friend: UserFriend) => {
        selectFriend(toOption(friend));
    };

    return (
        <>
            <Grid container className="friend-picker">
                <Grid item lg={12} md={12} xs={12}>
                    <Autocomplete<FriendOption>
                        selectedOptions={selectedOptions as FriendOption[]}
                        isMultiple={isMultiple}
                        options={optionList}
                        name={name}
                        label={title}
                        onRemove={handleOnRemove}
                        onSelect={handleOnSelect}
                        renderOption={(option, isSelected) => {
                            if (option.id === ADD_FRIEND_OPTION_ID) {
                                return (
                                    <div className="friend-option friend-option-invite">
                                        <span className="friend-option-icon">
                                            <PersonAddAlt1OutlinedIcon fontSize="small" />
                                        </span>
                                        <span className="friend-option-main">
                                            <span className="friend-option-name">
                                                Invite a friend
                                            </span>
                                            <span className="friend-option-sub">
                                                Send an email invite
                                            </span>
                                        </span>
                                    </div>
                                );
                            }
                            const initial =
                                option.label.charAt(0).toUpperCase() || '?';
                            return (
                                <div
                                    className={
                                        'friend-option' +
                                        (isSelected ? ' is-selected' : '')
                                    }
                                >
                                    <span className="friend-option-avatar">
                                        {initial}
                                    </span>
                                    <span className="friend-option-main">
                                        <span className="friend-option-name">
                                            {option.label}
                                            {option.pending && (
                                                <span className="friend-option-pending">
                                                    Invited
                                                </span>
                                            )}
                                        </span>
                                        {option.email && (
                                            <span className="friend-option-sub">
                                                {option.email}
                                            </span>
                                        )}
                                    </span>
                                    {isSelected && (
                                        <span className="friend-option-tag">Added</span>
                                    )}
                                </div>
                            );
                        }}
                    />
                </Grid>
            </Grid>

            <InviteFriendModal
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
                onInvited={handleInvited}
            />
        </>
    );
};

export default FriendPicker;
