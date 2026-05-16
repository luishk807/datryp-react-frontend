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
 */
const MainSection = ({
  title,
  icon,
  size = "sm",
  children,
}: MainSectionProps) => (
  <section className={classNames("main-section", `size-${size}`)}>
    <h3 className="main-section-heading">
      {icon && (
        <span className="main-section-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {title}
    </h3>
    {children}
  </section>
);

export default MainSection;
