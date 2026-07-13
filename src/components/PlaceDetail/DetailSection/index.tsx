import { useId } from "react";
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
  /** Heading level for the card title. `2` (default) when the card is a
   *  top-level page section; `3` when it's nested under a grouping section
   *  (e.g. Airports / Visa inside "Travel information") so the document
   *  outline stays correct — h1 → h2 → h3, never skipping a level. */
  headingLevel?: 2 | 3;
}

/**
 * White rounded card with a green-accent icon, bold title, and arbitrary
 * children. The visual building block for almost every section on the
 * place-detail page (Weather, Currency, Travel basics, Where to stay, …).
 * Parent layouts can shrink the padding/title size via contextual selectors
 * — see `.place-detail-content-side .detail-section` and
 * `.place-detail-side .detail-section` in the page stylesheet.
 *
 * Accessibility: this is a semantic `<section>` labelled by its `<h2>`, so it's
 * exposed as a named `region` landmark. Screen-reader users jump straight to
 * "Weather" / "Currency" / … via heading + landmark navigation and read the
 * body with browse-mode reading commands. It is deliberately NOT a tab stop —
 * informational cards must not swallow Tab; Tab stops belong to real controls
 * (toggles, links, buttons) that live inside a card. Score bars use
 * `role="meter"`, compound values (currency, ratings) get an `aria-label`, and
 * decorative icons are `aria-hidden` — native structure first, ARIA only where
 * the visual presentation doesn't already convey the meaning.
 */
const DetailSection = ({
  title,
  icon,
  children,
  className,
  badge,
  headingLevel = 2,
}: DetailSectionProps) => {
  const titleId = useId();
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <section
      className={classNames("detail-section", className)}
      role="region"
      aria-labelledby={titleId}
    >
      <Heading id={titleId} className="detail-section-title">
        <span className="detail-section-icon" aria-hidden="true">
          {icon}
        </span>
        {title}
        {badge != null && <span className="detail-section-badge">{badge}</span>}
      </Heading>
      <div className="detail-section-body">{children}</div>
    </section>
  );
};

export default DetailSection;
