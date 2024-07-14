import React from 'react';
import PropTypes from 'prop-types';
import './index.css';
import classNames from 'classnames';

const ButtonIcon = ({
    title = '',
    Icon,
    onClick,
    style,
    type = "standard"
}) => {
    return (
        <button onClick={onClick} style={style} className={classNames(
            {
                'button-icon': type==="standard",
                'button-simple': type==="text",
            }
        )}>
            {title} { Icon && (<Icon />) }
        </button>
    );
};


ButtonIcon.propTypes = {
    title: PropTypes.string,
    Icon: PropTypes.object,
    style: PropTypes.object,
    onClick: PropTypes.func.isRequired,
    type: PropTypes.oneOf(['text', 'standard'])
};
export default ButtonIcon;