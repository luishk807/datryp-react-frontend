import React, {useMemo} from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
    TextField
} from '@mui/material';
import InputField from '../../common/FormFields/InputField';
import { friends} from '../../../sample';
import Autocomplete from '../../common/Autocomplete';
  
const FriendPicker = ({
    onChange
}) => {

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
        console.log(list);
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