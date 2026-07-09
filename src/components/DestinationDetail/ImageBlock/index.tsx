import './index.scss';
import { NO_IMAGE } from 'constants';
import type { ImageRef } from 'types';

interface ImageBlockProps {
    image?: ImageRef | null;
}

const ImageBlock = ({ image }: ImageBlockProps) => {
    return (
        <div className="activity-image">
            {image ? (
                <img src={image.url} alt={image.name} />
            ) : (
                <div className="in-no-image">
                    <img src={NO_IMAGE} alt="" />
                </div>
            )}
        </div>
    );
};

export default ImageBlock;
