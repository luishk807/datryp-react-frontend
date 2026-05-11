import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import { Grid } from '@mui/material';
import { friends } from '../../../sample';
import Autocomplete from '../../common/FormFields/Autocomplete';
import AddFriendBtn, { type NewFriendInput } from '../../common/AddFriendBtn';
import type { Friend } from 'types/trip.types';
import type { ModalButtonHandle } from 'components/ModalButton';

interface FriendOption {
    id: number;
    label: string;
}

interface SampleFriend {
    id: number;
    firstName: string;
    lastName: string;
}

interface FriendPickerProps {
    onChange: (name: string | undefined, e: { target: { value: Friend[] } }) => void;
    title?: string;
    name?: string;
    isMultiple?: boolean;
    selectedOptions?: Friend[];
}

const ADD_FRIEND_OPTION_ID = -1;

const FriendPicker = ({
    onChange,
    title = 'friends',
    name,
    isMultiple = true,
    selectedOptions = [],
}: FriendPickerProps) => {
    const modalRef = useRef<ModalButtonHandle>(null);
    const [optionList, setOptionList] = useState<FriendOption[]>([]);
    const [selectedFriendList, setSelectedFriendList] = useState<Friend[]>(selectedOptions);

    const prepareOptionList = (list: SampleFriend[]) => {
        const newList: FriendOption[] = list.map((item) => ({
            id: item.id,
            label: `${item.firstName} ${item.lastName}`,
        }));
        newList.push({ id: ADD_FRIEND_OPTION_ID, label: 'add friends' });
        setOptionList(newList);
    };

    useEffect(() => {
        prepareOptionList(friends);
    }, []);

    const handleOnSelect = (e: FriendOption) => {
        if (e.id === ADD_FRIEND_OPTION_ID) {
            modalRef.current?.openModel();
            return;
        }
        const next = [...selectedFriendList, e];
        setSelectedFriendList(next);
        onChange(name, { target: { value: next } });
    };

    const handleOnRemove = (e: Friend[]) => {
        const next = selectedFriendList.filter((item) => item.id !== e[0].id);
        setSelectedFriendList(next);
        onChange(name, { target: { value: next } });
    };

    const handleFriendOnChange = (e: NewFriendInput | null) => {
        if (!e?.firstName || !e?.lastName) return;
        friends.push({
            id: optionList.length + 1,
            firstName: e.firstName,
            lastName: e.lastName,
        });
        prepareOptionList(friends);
        modalRef.current?.closeModal();
    };

    return (
        <>
            <Grid container>
                <Grid item lg={12} md={12} xs={12}>
                    <Autocomplete
                        selectedOptions={selectedOptions}
                        isMultiple={isMultiple}
                        options={optionList}
                        name={name}
                        label={title}
                        onRemove={handleOnRemove}
                        onSelect={handleOnSelect}
                    />
                </Grid>
            </Grid>
            <AddFriendBtn ref={modalRef} onChange={handleFriendOnChange} />
        </>
    );
};

export default FriendPicker;
