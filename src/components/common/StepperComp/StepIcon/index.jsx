import React from 'react';
import classnames from 'classnames';
import './index.css';
import PropTypes from 'prop-types';

const StepIcon = ({
    active,
    completed,
    icon
}) => {
    return (
        <div className={classnames('StepIconCustom',{
            'active': active,
        })}>
            <div className="label">{icon}</div>
        </div>
    );
};

StepIcon.propTypes = {
    active: PropTypes.bool,
    completed: PropTypes.bool,
    icon: PropTypes.number
};
export default StepIcon;