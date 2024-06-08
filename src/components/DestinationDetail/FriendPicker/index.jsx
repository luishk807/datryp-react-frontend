import React, {useMemo, useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
    TextField
} from '@mui/material';
import {} from 'redux';
import InputField from '../../common/FormFields/InputField';
import { friends} from '../../../sample';
import Autocomplete from '../../common/Autocomplete';
  
const FriendPicker = ({
    onChange
}) => {
    const [friendList, setFriendList] = useState([]);
    const handleOnChange = (e) => {
        setFriendList((prev) => [...prev, e]);
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
            console.log("sending", 'friends', {target: friendList });
            onChange('friends', {target: friendList });
        }
        return () => {
            unmounted = true;
        };
    }, [friendList]);

    return (
        <div>
            <Grid container>
                <Grid item lg={12} md={12} xs={12}>
                    {/* <InputField name="fiend"/> */}
                    <Autocomplete
                        isMultiple = {true}
                        options={optionList}
                        label="friends"
                        onDropChange={handleOnChange}
                    />
                </Grid>
            </Grid>
        </div>
    );
};

FriendPicker.propTypes = {
    onChange: PropTypes.func
};
export default FriendPicker;