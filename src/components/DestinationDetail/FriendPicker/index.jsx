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
    title = "friends",
    name,
    isMultiple = true,
    selectedOptions = []
}) => {
    const childRef = useRef();
    const [optionList, setOptionList] = useState([]);
    const [selectedFriendList, setSelectedFriendList] = useState(selectedOptions);
    const handleOnSelect = (e) => {
        if(e.id !== -1) {
            const currFriends = JSON.parse(JSON.stringify(selectedFriendList));
            currFriends.push(e);
            setSelectedFriendList((prev) => [...prev, e]);
            onChange(name, {target: { value: currFriends}});
        } else {
            childRef.current.openModel();
        }
    };
    
    const handleOnRemove = (e) => {
        const newFriends = selectedFriendList.filter(item => item.id !== e[0].id);
        setSelectedFriendList(newFriends);
        onChange(name, {target: { value: newFriends }});
    };

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

    // useEffect(() => {
    //     let isMounted = true;

    //     if (isMounted) {
    //         onChange('friends', {target: { value: selectedFriendList }});
    //     }
    //     return () => isMounted = false;
    // }, [selectedFriendList]);

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
                        isMultiple = {isMultiple}
                        options={optionList}
                        name={name}
                        label={title}
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
    name: PropTypes.string,
    title: PropTypes.string,
    isMultiple: PropTypes.bool,
    selectedOptions: PropTypes.array
};
export default FriendPicker;