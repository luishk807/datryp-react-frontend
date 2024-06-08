import React, {useMemo, useState} from 'react';
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
        console.log("friend picker", e);
        setFriendList((prev) => [...prev, e]);
        console.log("sending", 'friends', {target: friendList });
        onChange('friends', {target: friendList });
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
        console.log('heyyy', list);
        return list;
    }, [friends]);
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