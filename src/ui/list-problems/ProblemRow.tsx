import { useState } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Text } from '@dynatrace/strato-components/typography';

/** Formats a duration in seconds to a human-readable approximate string (e.g. "~2 min"). */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return '< 1 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `~${hours} h`;
  const days = Math.round(hours / 24);
  return `~${days} d`;
}

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const isActive = status === 'ACTIVE';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: '3px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: isActive
          ? 'var(--dt-colors-background-critical-subtle, rgba(196, 20, 37, 0.1))'
          : 'var(--dt-colors-background-neutral-subtle, rgba(0,0,0,0.05))',
        color: isActive ? 'var(--dt-colors-text-critical-default, #c41425)' : 'var(--dt-colors-text-neutral-subdued)',
        border: isActive
          ? '1px solid var(--dt-colors-border-critical-default, rgba(196, 20, 37, 0.3))'
          : '1px solid var(--dt-colors-border-neutral-default)',
        whiteSpace: 'nowrap',
      }}
    >
      {isActive ? 'Active' : 'Closed'}
    </span>
  );
}

export interface ProblemRecord {
  'event.status'?: unknown;
  'event.category'?: unknown;
  'event.name'?: unknown;
  'display_id'?: unknown;
  'problem_id'?: unknown;
  'duration'?: unknown;
  'affected_users_count'?: unknown;
  'affected_entities_count'?: unknown;
  [key: string]: unknown;
}

interface ProblemRowProps {
  problem: ProblemRecord;
  environmentUrl?: string;
  onNavigate?: (url: string) => void;
}

export function ProblemRow({ problem, environmentUrl, onNavigate }: ProblemRowProps) {
  const [hovered, setHovered] = useState(false);

  const status = String(problem['event.status'] ?? '');
  const category = String(problem['event.category'] ?? '');
  const name = String(problem['event.name'] ?? 'Unknown Problem');
  const displayId = String(problem['display_id'] ?? '');
  const duration = Number(problem['duration'] ?? 0);
  const problemId = String(problem['problem_id'] ?? '');

  const durationText = formatDuration(duration);
  const problemUrl =
    environmentUrl && problemId ? `${environmentUrl}/ui/apps/dynatrace.davis.problems/problem/${problemId}` : undefined;

  const isClickable = Boolean(problemUrl && onNavigate);

  const handleClick = () => {
    if (problemUrl && onNavigate) {
      onNavigate(problemUrl);
    }
  };

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
      onMouseEnter={isClickable ? () => setHovered(true) : undefined}
      onMouseLeave={isClickable ? () => setHovered(false) : undefined}
      style={{
        background: hovered
          ? 'var(--dt-colors-background-surface-raised)'
          : 'var(--dt-colors-background-surface-default)',
        border: '1px solid var(--dt-colors-border-neutral-default)',
        borderRadius: 'var(--dt-borders-radius-surface-default, 4px)',
        padding: '6px 12px',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background 0.1s ease',
      }}
    >
      <Flex flexDirection='row' alignItems='center' gap={6}>
        <StatusBadge status={status} />
        <Text
          textStyle='base-emphasized'
          style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9375rem' }}
        >
          {name}
        </Text>
        <Text
          textStyle='small'
          style={{ color: 'var(--dt-colors-text-neutral-subdued)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}
        >
          {durationText}
        </Text>
      </Flex>
      <Text
        textStyle='small'
        style={{ color: 'var(--dt-colors-text-neutral-subdued)', marginTop: 1, fontSize: '0.8125rem' }}
      >
        {category}
        {displayId ? ` · ${displayId}` : ''}
      </Text>
    </div>
  );
}
