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

/** Groups smaller than this are drawn in grey: their rate swings by chance. */
const SMALL_GROUP_SIZE = 10
/** The difference scale never zooms in further than this many points. */
const MIN_SCALE = 0.1
const SCALE_STEP = 0.05

const isSmall = (group: GroupResult) => group.total < SMALL_GROUP_SIZE

/** A signed gap in percentage points, such as '+6' or '−15'. */
function formatPoints(difference: number) {
  const points = Math.round(difference * 100)
  if (points === 0) return '0'
  return points > 0 ? `+${points}` : `−${Math.abs(points)}`
}

/**
 * The largest gap from the overall rate among groups big enough to trust,
 * rounded up to a tidy number. Every chart uses it, so a bar of a given
 * length means the same gap everywhere on the page.
 */
function differenceScale(summary: RetentionSummary) {
  const gaps = summary.attributes.flatMap((attribute) =>
    attribute.groups
      .filter((group) => !isSmall(group))
      .map((group) => Math.abs(group.rate - summary.rate)),
  )
  const largest = Math.max(MIN_SCALE, ...gaps)
  return Math.ceil(largest / SCALE_STEP - 1e-9) * SCALE_STEP
}

function describeGroup(group: GroupResult, overallRate: number) {
  const statuses = STATUSES.map(
    (status) => `${STATUS_LABELS[status]}: ${group.statusCounts[status]}`,
  )
  return [
    `${group.retained} of ${group.total} retained (${formatPercent(group.rate)})`,
    `${formatPoints(group.rate - overallRate)} points against all members`,
    ...statuses,
  ].join('\n')
}

function AttributeChart({
  attribute,
  summary,
  scale,
  largestGroup,
}: {
  attribute: AttributeBreakdown
  summary: RetentionSummary
  /** Size of the biggest group on the page; its size bar is full length. */
  largestGroup: number
  /** The gap, 0 to 1, that fills half the difference track. */
  scale: number
}) {
  return (
    <section className="attribute-chart">
      <h3>{attribute.label}</h3>
      <div className="chart-columns" aria-hidden="true">
        <span>Members</span>
        <span>Retained, against {formatPercent(summary.rate)} overall</span>
      </div>
      <ul className="group-list">
        {attribute.groups.map((group) => {
          const difference = group.rate - summary.rate
          // A gap that rounds to zero is neither above nor below.
          const level = Math.round(difference * 100) === 0
          const muted = level || group.label === NOT_GIVEN || isSmall(group)
          const direction = difference < 0 ? 'below' : 'above'
          return (
            <li key={group.label} title={describeGroup(group, summary.rate)}>
              <span className="group-label">
                {group.label}
                {isSmall(group) && (
                  <span className="group-flag"> few members</span>
                )}
              </span>
              <div className="group-row">
                <div className="size-cell">
                  <div
                    className="size-bar"
                    style={
                      { '--value': group.total / largestGroup } as React.CSSProperties
                    }
                  />
                  <span className="cell-value">{group.total}</span>
                </div>
                <div className="difference-track">
                  <div
                    className={`difference-bar ${direction}${muted ? ' muted' : ''}`}
                    style={
                      {
                        '--value': Math.min(1, Math.abs(difference) / scale),
                      } as React.CSSProperties
                    }
                  />
                </div>
                <span className="cell-value rate-value">
                  {formatPercent(group.rate)}
                  <span className="rate-difference">
                    {' '}
                    {formatPoints(difference)}
                  </span>
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function RetentionView({ summary }: { summary: RetentionSummary }) {
  const scale = differenceScale(summary)
  const largestGroup = Math.max(
    ...summary.attributes.flatMap((attribute) =>
      attribute.groups.map((group) => group.total),
    ),
  )

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
        The grey bar is how many members are in each group. The coloured bar
        is how far that group's retention is from the {formatPercent(summary.rate)}{' '}
        for all members, in points.
      </p>
      <ul className="chart-legend">
        <li>
          <span className="legend-swatch above" /> Above overall
        </li>
        <li>
          <span className="legend-swatch below" /> Below overall
        </li>
        <li>
          <span className="legend-swatch muted" /> Under {SMALL_GROUP_SIZE}{' '}
          members, or not given
        </li>
        <li>Full width is {Math.round(scale * 100)} points either way</li>
      </ul>
      <div className="attribute-grid">
        {summary.attributes.map((attribute) => (
          <AttributeChart
            key={attribute.id}
            attribute={attribute}
            summary={summary}
            scale={scale}
            largestGroup={largestGroup}
          />
        ))}
      </div>
    </div>
  )
}
