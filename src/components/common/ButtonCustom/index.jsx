import React from 'react';
import PropTypes from 'prop-types';
import './index.css';
import classNames from 'classnames';

const ButtonCustom = ({
    label = '',
    onClick,
    capitalizeType = 'capitalize',
    type = 'standard',
    style = null
}) => {
    return (
        <button style={style} className={classNames({
            'main-button': type === 'standard',
            'plain-button': type === 'plain',
            'text-button': type === 'text',
            'standard-small': type === 'standard-small',
            'capitalize': capitalizeType === 'capitalize',
            'lowercase': capitalizeType === 'lowercase',
            'uppercase': capitalizeType === 'uppercase'
        })} onClick={onClick}>
            {label}
        </button>
    );
};

ButtonCustom.propTypes = {
    label: PropTypes.string,
    onClick: PropTypes.func,
    style: PropTypes.object,
    capitalizeType: PropTypes.oneOf(['capitalize', 'uppercase', 'lowercase']),
    type: PropTypes.oneOf(['plain','text', 'standard', 'standard-small'])
};

export default ButtonCustom;