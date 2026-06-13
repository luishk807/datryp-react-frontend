import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { Trans, useTranslation } from "react-i18next";
import { useUser } from "context/UserContext";
import type { NamedTip } from "types";
import "./index.scss";

export interface ExperienceHighlightsProps {
  /** The full `things_to_do` list from the enriched detail payload.
   *  Only the first 4 are rendered; only those with an `imageUrl`
   *  populated show up (older cached rows that pre-date Unsplash
   *  enrichment self-hide gracefully). */
  things: NamedTip[] | undefined;
}

/**
 * Pro-only "Experience Highlights" image strip rendered above the
 * Travel Basics section on place / country / city detail pages. Picks
 * the first 4 `things_to_do` entries that carry an Unsplash-enriched
 * imageUrl and renders them as a horizontal row of image cards with
 * a name + 1-sentence why overlay.
 *
 * Gated inside the component (rather than at each consumer) so all
 * three call sites get the gate for free. Also self-hides for any
 * cached row that doesn't yet have images enriched — saves consumers
 * from threading a "data ready" guard.
 */
const ExperienceHighlights = ({ things }: ExperienceHighlightsProps) => {
  const { t } = useTranslation();
  const { user, isAdmin } = useUser();
  const isPro = Boolean(user && (user.isPaidMember || isAdmin));
  if (!isPro) return null;
  if (!things || things.length === 0) return null;

  // Only show items that actually have an enriched image — keeps the
  // strip visually consistent (no awkward placeholders). Cap at 4 so
  // the row stays one-line-ish on desktop.
  const highlights = things.filter((t) => Boolean(t.imageUrl)).slice(0, 4);
  if (highlights.length === 0) return null;

  return (
    <section
      className="experience-highlights"
      aria-label={t('detail.common.experience.aria')}
    >
      <header className="experience-highlights-header">
        <span className="experience-highlights-eyebrow">
          <AutoAwesomeRoundedIcon className="experience-highlights-eyebrow-icon" />
          <span>{t('detail.common.experience.eyebrow')}</span>
        </span>
        <h2 className="experience-highlights-title">
          {t('detail.common.experience.title')}
        </h2>
      </header>
      <ul className="experience-highlights-grid">
        {highlights.map((tip) => (
          <li key={tip.name} className="experience-highlights-card">
            <div className="experience-highlights-card-media">
              <img
                src={tip.imageUrl as string}
                alt={tip.name}
                loading="lazy"
              />
              <div
                className="experience-highlights-card-scrim"
                aria-hidden="true"
              />
              {tip.photographerName && (
                <span className="experience-highlights-card-attribution">
                  <Trans
                    i18nKey="home.attribution"
                    values={{ name: tip.photographerName }}
                    components={{
                      author: tip.photographerUrl ? (
                        <a
                          href={tip.photographerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      ) : (
                        <span />
                      ),
                      unsplash: (
                        <a
                          href="https://unsplash.com"
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      ),
                    }}
                  />
                </span>
              )}
            </div>
            <div className="experience-highlights-card-body">
              <h3 className="experience-highlights-card-name">{tip.name}</h3>
              <p className="experience-highlights-card-why">{tip.why}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ExperienceHighlights;
