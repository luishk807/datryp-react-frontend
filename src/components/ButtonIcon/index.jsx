import React from 'react';
import PropTypes from 'prop-types';
import './index.css';

const ButtonIcon = ({
    title = '',
    Icon,
    onClick
}) => {
    return (
        <button onClick={onClick} className="button-icon">
            {title}<Icon />
        </button>
    );
};


ButtonIcon.propTypes = {
    title: PropTypes.string,
    Icon: PropTypes.object,
    onClick: PropTypes.func.isRequired
};
export default ButtonIcon;