import React, { useState, useEffect } from 'react';
import useWindowSize from 'react-use/lib/useWindowSize';
import Confetti from 'react-confetti';
import PropTypes from 'prop-types';

const ConfettiComp = ({
    activate = false,
    recycle = false,
}) => {
    const { width, height } = useWindowSize();
    return (
        <Confetti
            width={width}
            height={height}
            numberOfPieces={activate ? 500 : 0}
            recycle={recycle}
            onConfettiComplete={confetti => {
                confetti.reset();
            }}
        />
    );
};

ConfettiComp.propTypes = {
    activate: PropTypes.bool,
    recycle: PropTypes.bool,
};

export default ConfettiComp;