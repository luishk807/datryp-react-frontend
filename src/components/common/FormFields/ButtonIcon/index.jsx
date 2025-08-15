import React from 'react';
import PropTypes from 'prop-types';
import './index.css';
import classNames from 'classnames';

const ButtonIcon = ({
    title = '',
    Icon,
    onClick,
    style,
    type = "standard",
    isViewMode = false,
}) => { 
    return !isViewMode && (
        <button onClick={onClick} style={style} className={classNames(
            {
                'button-icon': type==="standard",
                'button-simple': type==="text",
                'button-no-style': type==="text-plain"
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
    type: PropTypes.oneOf(['text', 'standard', 'text-plain']),
    isViewMode: PropTypes.bool
};
export default ButtonIcon;