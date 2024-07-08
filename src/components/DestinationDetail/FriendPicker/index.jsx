import React, {useMemo, useState, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
} from '@mui/material';
import { friends} from '../../../sample';
import Autocomplete from '../../common/Autocomplete';
import AddFriendBtn from '../../common/AddFriendBtn';

const FriendPicker = ({
    onChange,
    selectedOptions = []
}) => {
    const childRef = useRef();
    const [friendList, setFriendList] = useState([]);
    const handleOnSelect = (e) => {
        if(e.id !== -1) {
            setFriendList((prev) => [...prev, e]);
        } else {
            childRef.current.openModel();
        }

    };
    
    const handleOnRemove = (e) => {
        const newFriends = friendList.filter(item => item.id !== e[0].id);
        setFriendList(newFriends);
        console.log("new list", newFriends);
    };
    
    const optionList = useMemo(() => {
        const list = friends.map(item => {
            return {
                id: item.id,
                label: `${item.firstName} ${item.lastName}`
            };
        });

        list.push({
            id: -1,
            label: "add friends"
        });

        return list;
    }, [friends]);

    useEffect(() => {
        let unmounted = false;

        if (!unmounted) {
            onChange('friends', {target: { value: friendList }});
        }
        return () => {
            unmounted = true;
        };
    }, [friendList]);

    const handleFriendOnChange = (e) => {
        console.log("fiends", e);
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