import classNames from "classnames";
import "./index.scss";

export interface DetailSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  /** Optional extra class on the `.detail-section` wrapper — lets one
   *  specific section override the default card chrome (border / shadow /
   *  fill), e.g. the Essential apps section rendering inline under Budget. */
  className?: string;
  /** Optional small pill at the end of the title row — e.g. the curated item
   *  count ("5") on the Must-see / Must-eat lists, so the shortlist still
   *  reads as hand-picked after dropping the "Top 5" wording. */
  badge?: React.ReactNode;
}

/**
 * White rounded card with a green-accent icon, bold title, and arbitrary
 * children. The visual building block for almost every section on the
 * place-detail page (Weather, Currency, Travel basics, Where to stay, …).
 * Parent layouts can shrink the padding/title size via contextual selectors
 * — see `.place-detail-content-side .detail-section` and
 * `.place-detail-side .detail-section` in the page stylesheet.
 */
const DetailSection = ({ title, icon, children, className, badge }: DetailSectionProps) => (
  <section className={classNames("detail-section", className)}>
    <h2 className="detail-section-title">
      <span className="detail-section-icon">{icon}</span>
      {title}
      {badge != null && <span className="detail-section-badge">{badge}</span>}
    </h2>
    {children}
  </section>
);

export default DetailSection;
