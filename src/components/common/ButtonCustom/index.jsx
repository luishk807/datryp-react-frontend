import React from 'react';
import PropTypes from 'prop-types';
import './index.css';

const ButtonCustom = ({
    label = '',
    onClick,
}) => {
    return (
        <button className="main-button" onClick={onClick}>
            {label}
        </button>
    );
};

ButtonCustom.propTypes = {
    label: PropTypes.string,
    onClick: PropTypes.func
};

export default ButtonCustom;