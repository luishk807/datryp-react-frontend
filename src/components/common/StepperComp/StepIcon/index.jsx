import React from 'react';
import './index.css';
import PropTypes from 'prop-types';

const StepIcon = ({
    label=1
}) => {
    return (
        <div className="StepIconCustom">
            <div className="label">{label}</div>
        </div>
    );
};

StepIcon.propTypes = {
    label: PropTypes.number
};
export default StepIcon;