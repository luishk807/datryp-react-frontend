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
  /** How the section exposes its content to assistive tech when focus lands
   *  on the card.
   *  - `'describe'` (default): the body is referenced via `aria-describedby`,
   *    so a screen reader announces the title then reads the whole content.
   *    Right for single-widget blocks (Weather, Currency, Safety, …) whose
   *    body has no individually-focusable parts.
   *  - `'items'`: the section announces only its title; use when the body's
   *    rows are themselves keyboard tab stops (e.g. Hidden gems, where each
   *    gem is focusable and voices its own name). Prevents the content being
   *    announced twice — once as the region description and again per row. */
  contentRead?: 'describe' | 'items';
}

/**
 * White rounded card with a green-accent icon, bold title, and arbitrary
 * children. The visual building block for almost every section on the
 * place-detail page (Weather, Currency, Travel basics, Where to stay, …).
 * Parent layouts can shrink the padding/title size via contextual selectors
 * — see `.place-detail-content-side .detail-section` and
 * `.place-detail-side .detail-section` in the page stylesheet.
 *
 * Exposed as a named `role="region"` landmark (accessible name = its title,
 * via `aria-labelledby`) and made a keyboard tab stop (`tabIndex={0}`) so
 * keyboard + screen-reader users can jump straight to each content widget
 * (Weather, Currency, Safety, …) rather than tabbing through inert prose.
 *
 * The body is wrapped in a `.detail-section-body` div referenced by
 * `aria-describedby`, so when focus lands on the box a screen reader (e.g.
 * Windows Narrator) announces the title AND reads the section's content (the
 * safety level, "68/100", the advice, …) — not just the title. The wrapper is
 * `display: contents` so it generates no box: the body's children stay direct
 * flow/flex items of `.detail-section` exactly as before (the sidebar cards
 * turn `.detail-section` into a flex column), so nothing shifts visually.
 */
const DetailSection = ({
  title,
  icon,
  children,
  className,
  badge,
  contentRead = "describe",
}: DetailSectionProps) => {
  const titleId = useId();
  const bodyId = useId();
  return (
    <section
      className={classNames("detail-section", className)}
      role="region"
      aria-labelledby={titleId}
      aria-describedby={contentRead === "describe" ? bodyId : undefined}
      tabIndex={0}
    >
      <h2 id={titleId} className="detail-section-title">
        <span className="detail-section-icon" aria-hidden="true">
          {icon}
        </span>
        {title}
        {badge != null && <span className="detail-section-badge">{badge}</span>}
      </h2>
      <div id={bodyId} className="detail-section-body">
        {children}
      </div>
    </section>
  );
};

export default DetailSection;
