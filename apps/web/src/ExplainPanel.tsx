import type { CountryResult, PropertyType, Rule, Verdict, ZoneResult } from '@aiestate/rules-engine';
import type { CSSProperties } from 'react';
import { PROPERTY_LABELS, SOURCE_LABELS, STATUS_LABELS, VERDICT_STYLE } from './verdicts';

interface Props {
  name: string;
  result: CountryResult;
  propertyType: PropertyType;
  onClose(): void;
}

export function VerdictBadge({ verdict, label }: { verdict: Verdict; label?: string }) {
  const style = VERDICT_STYLE[verdict];
  return (
    <span className="badge" style={{ '--badge': style.color } as CSSProperties}>
      <span aria-hidden="true">{style.symbol}</span> {label ?? style.label}
    </span>
  );
}

function dateRange(rule: Rule) {
  if (rule.effective_from && rule.effective_to) return `In force ${rule.effective_from} to ${rule.effective_to}`;
  if (rule.effective_from) return `In force from ${rule.effective_from}`;
  if (rule.effective_to) return `In force until ${rule.effective_to}`;
  return null;
}

function RuleCard({ rule }: { rule: Rule }) {
  const source = SOURCE_LABELS[rule.source_type];
  const dates = dateRange(rule);
  return (
    <article className="rule">
      <header>
        <VerdictBadge verdict={rule.verdict} label={VERDICT_STYLE[rule.verdict].short} />
        <h4>{rule.title}</h4>
      </header>
      <p>{rule.summary}</p>
      {rule.conditions && rule.conditions.length > 0 && (
        <ul className="conditions">
          {rule.conditions.map((c) => (
            <li key={c.text}>{c.text}</li>
          ))}
        </ul>
      )}
      {rule.notes && <p className="muted small">{rule.notes}</p>}
      <footer className="rule-meta">
        <span className={`tag tag-${source.tone}`}>{source.label}</span>
        {dates && <span>{dates}</span>}
        <span>{rule.last_verified ? `Checked ${rule.last_verified}` : 'Never checked'}</span>
        {rule.sources.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
            {s.title} ↗
          </a>
        ))}
      </footer>
    </article>
  );
}

function ZoneSection({ zone, showLabel }: { zone: ZoneResult; showLabel: boolean }) {
  return (
    <section className="zone">
      {showLabel && <h3>{zone.zone.label}</h3>}
      {zone.zone.description && showLabel && <p className="muted small">{zone.zone.description}</p>}
      <VerdictBadge verdict={zone.verdict} />
      {zone.matched.length === 0 ? (
        <p className="muted">No rule we hold covers this case, so we do not guess.</p>
      ) : (
        zone.matched.map((r) => <RuleCard key={r.id} rule={r} />)
      )}
    </section>
  );
}

export function ExplainPanel({ name, result, propertyType, onClose }: Props) {
  const multiZone = result.zones.length > 1;
  return (
    <section className="panel explain-panel" aria-labelledby="explain-heading">
      <header className="panel-header">
        <div>
          <h2 id="explain-heading">{name}</h2>
          <p className="muted small">
            {PROPERTY_LABELS[propertyType]} · you are treated as {STATUS_LABELS[result.status]}
          </p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close details">
          ×
        </button>
      </header>

      {!result.covered && (
        <p className="notice">
          We have not researched {name} yet. {result.best === 'UNKNOWN' ? 'We show it as unknown instead of guessing.' : ''}
        </p>
      )}

      {multiZone && (
        <ul className="zone-summary">
          {result.zones.map((z) => (
            <li key={z.zone.id}>
              <VerdictBadge verdict={z.verdict} label={VERDICT_STYLE[z.verdict].short} />
              <span>{z.zone.label}</span>
            </li>
          ))}
        </ul>
      )}

      {result.zones.map((z) => (
        <ZoneSection key={z.zone.id} zone={z} showLabel={multiZone} />
      ))}

      <p className="disclaimer">
        This is general information from public sources, not legal advice. Rules change; confirm with a lawyer
        qualified in {name} before you commit to a purchase.
      </p>
    </section>
  );
}
