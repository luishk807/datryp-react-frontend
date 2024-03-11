import React from 'react';
import PropTypes from 'prop-types';
import './index.css';

const ButtonIcon = ({
    title,
    Icon
}) => {
    return (
        <button className="button-icon">
            {title}<Icon />
        </button>
    );
};


ButtonIcon.propTypes = {
    title: PropTypes.string,
    Icon: PropTypes.object
};
export default ButtonIcon;