import useWindowSize from 'react-use/lib/useWindowSize';
import Confetti from 'react-confetti';

export interface ConfettiCompProps {
    activate?: boolean;
    recycle?: boolean;
}

const ConfettiComp = ({ activate = false, recycle = false }: ConfettiCompProps) => {
    const { width, height } = useWindowSize();
    return (
        <Confetti
            width={width}
            height={height}
            numberOfPieces={activate ? 500 : 0}
            recycle={recycle}
            onConfettiComplete={(confetti) => {
                confetti?.reset();
            }}
        />
    );
};

export default ConfettiComp;
