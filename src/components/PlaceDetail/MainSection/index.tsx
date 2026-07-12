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
 * heading is an `<h2>` and the block is a semantic `<section>` labelled by that
 * heading — exposed as a named `region` landmark. Screen-reader users reach it
 * by heading/landmark navigation and read the body with browse-mode commands;
 * it is deliberately NOT a tab stop (informational content must not swallow
 * Tab). The `.main-section-body` wrapper is `display: contents` so it generates
 * no box — critical because `.main-section` is a flex column with a `gap`, and
 * the body's children must stay direct flex items to keep that spacing.
 */
const MainSection = ({
  title,
  icon,
  size = "sm",
  children,
}: MainSectionProps) => {
  const titleId = useId();
  return (
    <section
      className={classNames("main-section", `size-${size}`)}
      role="region"
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="main-section-heading">
        {icon && (
          <span className="main-section-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {title}
      </h2>
      <div className="main-section-body">
        {children}
      </div>
    </section>
  );
};

export default MainSection;
