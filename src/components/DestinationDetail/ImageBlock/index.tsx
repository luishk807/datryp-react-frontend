import './index.css';
import { NO_IMAGE } from 'constants';
import type { ImageRef } from 'types/trip.types';

interface ImageBlockProps {
    image?: ImageRef | null;
}

const ImageBlock = ({ image }: ImageBlockProps) => {
    return (
        <div className="activity-image">
            {image ? (
                <img src={image.url} />
            ) : (
                <div className="in-no-image">
                    <img src={NO_IMAGE} />
                </div>
            )}
        </div>
    );
};

export default ImageBlock;
