import React from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { NO_IMAGE } from 'constants';

const ImageBlock = ({ image }) => {
    return (
        <div className="activity-image">
            {
                image ? (
                    <img src={image?.url} />
                ) : (
                    <div className="in-no-image">
                        <img src={NO_IMAGE} />
                    </div>
                )
            }

        </div>
    );
};

ImageBlock.propTypes = {
    image: PropTypes.object
};

export default ImageBlock;