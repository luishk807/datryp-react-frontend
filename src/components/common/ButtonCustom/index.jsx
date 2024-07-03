import React from 'react';
import PropTypes from 'prop-types';
import './index.css';
import classNames from 'classnames';

const ButtonCustom = ({
    label = '',
    onClick,
    type
}) => {
    return (
        <button className={classNames({
            'main-button': type === 'standard',
            'plain-button': type === 'plain',
            'text-button': type === 'text'
        })} onClick={onClick}>
            {label}
        </button>
    );
};

ButtonCustom.propTypes = {
    label: PropTypes.string,
    onClick: PropTypes.func,
    type: PropTypes.oneOf(['plain','text', 'standard'])
};

export default ButtonCustom;