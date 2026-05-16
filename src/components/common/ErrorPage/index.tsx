import { Link, useNavigate } from 'react-router-dom';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import './index.scss';

export interface ErrorPageSecondaryAction {
    /** Visible link text (e.g. "Back to results"). */
    label: string;
    /** Internal route to navigate to. */
    to: string;
}

export interface ErrorPageProps {
    /** Document `<title>` (passed to Layout). Defaults to the visible `title`. */
    pageTitle?: string;
    /** Big headline shown on the page. */
    title: string;
    /** Optional supporting message — error detail, suggestion, etc. */
    description?: React.ReactNode;
    /** Optional MUI icon shown above the title. Defaults to a muted
     *  "error outline" circle. Pass `null` to suppress it. */
    icon?: React.ReactNode | null;
    /** Optional secondary CTA — typically a "back to X" link. Renders
     *  alongside the always-present "Go to home" primary button. */
    secondaryAction?: ErrorPageSecondaryAction;
    /** Primary CTA label. Defaults to "Go to home". */
    primaryActionLabel?: string;
}

/**
 * Friendly full-page error / 404 state. Centered icon + headline +
 * description + always-present "Go to home" button. Used both as the
 * catch-all 404 route and as a return-value for pages that hit an
 * unrecoverable load error or missing record (e.g. PlaceDetail with no
 * matching place at the given index).
 */
const ErrorPage = ({
    pageTitle,
    title,
    description,
    icon = <ErrorOutlineRoundedIcon className="error-page-icon-svg" />,
    secondaryAction,
    primaryActionLabel = 'Go to home',
}: ErrorPageProps) => {
    const navigate = useNavigate();

    return (
        <Layout title={pageTitle ?? title}>
            <div className="error-page">
                {icon && <div className="error-page-icon">{icon}</div>}
                <h1 className="error-page-title">{title}</h1>
                {description && (
                    <p className="error-page-description">{description}</p>
                )}
                <div className="error-page-actions">
                    {secondaryAction && (
                        <Link
                            to={secondaryAction.to}
                            className="error-page-secondary"
                        >
                            <ArrowBackRoundedIcon fontSize="small" />
                            {secondaryAction.label}
                        </Link>
                    )}
                    <ButtonCustom
                        label={primaryActionLabel}
                        capitalizeType="uppercase"
                        onClick={() => navigate('/')}
                    />
                </div>
            </div>
        </Layout>
    );
};

export default ErrorPage;
