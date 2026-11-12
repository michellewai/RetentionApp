import './RetentionView.css'
import { formatPercent } from '../lib/format.ts'
import { NOT_GIVEN } from '../retention/analyse.ts'
import type {
  AttributeBreakdown,
  GroupResult,
  RetentionSummary,
} from '../retention/analyse.ts'
import {
  AT_RISK_AFTER_DAYS,
  STATUSES,
  STATUS_LABELS,
} from '../retention/status.ts'

function statusBreakdown(group: GroupResult) {
  return STATUSES.map(
    (status) => `${STATUS_LABELS[status]}: ${group.statusCounts[status]}`,
  ).join('\n')
}

function AttributeChart({
  attribute,
  overallRate,
}: {
  attribute: AttributeBreakdown
  overallRate: number
}) {
  return (
    <section className="attribute-chart">
      <h3>{attribute.label}</h3>
      <ul className="bar-list">
        {attribute.groups.map((group) => (
          <li key={group.label}>
            <span className="bar-label">{group.label}</span>
            <div className="bar-track" title={statusBreakdown(group)}>
              <div
                className={group.label === NOT_GIVEN ? 'bar bar-muted' : 'bar'}
                style={{ '--value': group.rate } as React.CSSProperties}
              />
              <span
                className="bar-reference"
                style={{ '--value': overallRate } as React.CSSProperties}
              />
              <span className="bar-value">
                {formatPercent(group.rate)} · {group.retained} of {group.total}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function RetentionView({ summary }: { summary: RetentionSummary }) {
  return (
    <div className="viz-root">
      <dl className="stat-tiles">
        <div>
          <dt>Retained</dt>
          <dd>{formatPercent(summary.rate)}</dd>
          <dd className="stat-note">
            {summary.retained} of {summary.total} members
          </dd>
        </div>
        {STATUSES.map((status) => (
          <div key={status}>
            <dt>{STATUS_LABELS[status]}</dt>
            <dd>{summary.statusCounts[status]}</dd>
          </div>
        ))}
      </dl>
      <p className="chart-note">
        Retained means active or frozen. At risk means no visit in{' '}
        {AT_RISK_AFTER_DAYS} days. Day-pass visitors are not counted.
      </p>

      <h2>Retention by member attribute</h2>
      <p className="chart-note">
        Share of each group that is retained, with the number of members
        behind it. <span className="reference-key" /> All members:{' '}
        {formatPercent(summary.rate)}
      </p>
      <div className="attribute-grid">
        {summary.attributes.map((attribute) => (
          <AttributeChart
            key={attribute.id}
            attribute={attribute}
            overallRate={summary.rate}
          />
        ))}
      </div>
    </div>
  )
}
