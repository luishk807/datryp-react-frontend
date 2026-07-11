import { useId } from "react";
import classNames from "classnames";
import "./index.scss";

export type MainSectionSize = "xs" | "sm" | "md";

export interface MainSectionProps {
  /** Heading content. Plain text in the common case; `ReactNode` so the
   *  heading can also embed extras like an inline `CostBadge` that gets
   *  right-aligned via the contextual rule in this component's CSS. */
  title: React.ReactNode;
  /** Optional MUI icon rendered in front of the title. */
  icon?: React.ReactNode;
  /** Vertical gap between heading and content.
   *  - `xs` = 8px  (paragraph-only sections like "About <country>", Budget).
   *  - `sm` = 12px (list-like sections like Notes, default).
   *  - `md` = 14px (denser blocks like Local flavor, Nearby). */
  size?: MainSectionSize;
  children: React.ReactNode;
}

/**
 * Shared section block used in the main content column of the place-detail
 * page. Owns the recurring layout idiom: a 1px top divider, an uppercase
 * green heading with optional icon, and a flex-column body. Each consumer
 * (`Country`, `Notes`, `Local flavor`, `Nearby`, `BudgetSection`) varies
 * only in title content, icon, and `size`.
 *
 * These are top-level sections (siblings of the `DetailSection` cards), so the
 * heading is an `<h2>` and the block is exposed as a named `role="region"`
 * landmark (accessible name = its title) and a keyboard tab stop
 * (`tabIndex={0}`) — same reach-each-widget treatment as `DetailSection`.
 *
 * The body is wrapped in a `.main-section-body` div referenced by
 * `aria-describedby` so a screen reader reads the section content (not just the
 * title) when focus lands on the box. The wrapper is `display: contents` so it
 * generates no box — critical here because `.main-section` is a flex column
 * with a `gap`, and the body's children must stay direct flex items to keep
 * that spacing.
 */
const MainSection = ({
  title,
  icon,
  size = "sm",
  children,
}: MainSectionProps) => {
  const titleId = useId();
  const bodyId = useId();
  return (
    <section
      className={classNames("main-section", `size-${size}`)}
      role="region"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      tabIndex={0}
    >
      <h2 id={titleId} className="main-section-heading">
        {icon && (
          <span className="main-section-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {title}
      </h2>
      <div id={bodyId} className="main-section-body">
        {children}
      </div>
    </section>
  );
};

export default MainSection;
