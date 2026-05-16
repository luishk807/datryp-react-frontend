import "./index.scss";

export interface DetailSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

/**
 * White rounded card with a green-accent icon, bold title, and arbitrary
 * children. The visual building block for almost every section on the
 * place-detail page (Weather, Currency, Travel basics, Where to stay, …).
 * Parent layouts can shrink the padding/title size via contextual selectors
 * — see `.place-detail-content-side .detail-section` and
 * `.place-detail-side .detail-section` in the page stylesheet.
 */
const DetailSection = ({ title, icon, children }: DetailSectionProps) => (
  <section className="detail-section">
    <h2 className="detail-section-title">
      <span className="detail-section-icon">{icon}</span>
      {title}
    </h2>
    {children}
  </section>
);

export default DetailSection;
