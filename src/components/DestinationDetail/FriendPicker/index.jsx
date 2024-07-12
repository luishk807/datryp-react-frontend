import React, {useMemo, useState, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
} from '@mui/material';
import { friends} from '../../../sample';
import Autocomplete from '../../common/FormFields/Autocomplete';
import AddFriendBtn from '../../common/AddFriendBtn';

const FriendPicker = ({
    onChange,
    selectedOptions = []
}) => {
    const childRef = useRef();
    const [optionList, setOptionList] = useState([]);
    const [selectedFriendList, setSelectedFriendList] = useState([]);
    const handleOnSelect = (e) => {
        if(e.id !== -1) {
            setSelectedFriendList((prev) => [...prev, e]);
        } else {
            childRef.current.openModel();
        }
    };
    
    const handleOnRemove = (e) => {
        const newFriends = selectedFriendList.filter(item => item.id !== e[0].id);
        setSelectedFriendList(newFriends);
        console.log("new list", newFriends);
    };
    
    // const optionList = useMemo(() => {
    //     const list = friends.map(item => {
    //         return {
    //             id: item.id,
    //             label: `${item.firstName} ${item.lastName}`
    //         };
    //     });

    //     list.push({
    //         id: -1,
    //         label: "add friends"
    //     });

    //     return list;
    // }, [friends]);

    const prepareOptionList = (list) => {
        console.log("ths list.", list);
        const newList = list.map(item => {
            return {
                id: item.id,
                label: `${item.firstName} ${item.lastName}`
            };
        });

        newList.push({
            id: -1,
            label: "add friends"
        });

        setOptionList(newList);
    };

    useEffect(() => {
        let isMounted = true;

        if (isMounted) {
            prepareOptionList(friends);
        }

        return () => isMounted = false;
    }, [friends]);

    useEffect(() => {
        let isMounted = true;

        if (isMounted) {
            onChange('friends', {target: { value: selectedFriendList }});
        }
        return () => isMounted = false;
    }, [selectedFriendList]);

    const handleFriendOnChange = (e) => {
        console.log("fiends", e);
        const list = friends;
        list.push({
            id: optionList.length + 1,
            firstName: e.firstName,
            lastName: e.lastName
        });

        prepareOptionList(list);
        childRef.current.closeModal();
    };

    return (
        <>
            <Grid container>
                <Grid item lg={12} md={12} xs={12}>
                    <Autocomplete
                        selectedOptions = {selectedOptions}
                        isMultiple = {true}
                        options={optionList}
                        label="friends"
                        onRemove={handleOnRemove}
                        onSelect={handleOnSelect}
                    />
                </Grid>
            </Grid>
            <AddFriendBtn ref={childRef} onChange={handleFriendOnChange} />
        </>
    );
};

FriendPicker.propTypes = {
    onChange: PropTypes.func,
    selectedOptions: PropTypes.array
};
export default FriendPicker;