import { Text } from '@dynatrace/strato-components/typography';

export type SummaryCardVariant = 'critical' | 'neutral' | 'warning' | 'primary';

interface SummaryCardProps {
  count: number | string;
  label: string;
  variant: SummaryCardVariant;
}

const VARIANT_STYLES: Record<SummaryCardVariant, { background: string; color: string; border: string }> = {
  critical: {
    background: 'var(--dt-colors-background-critical-subtle, rgba(196, 20, 37, 0.08))',
    color: 'var(--dt-colors-text-critical-default, #c41425)',
    border: '1px solid var(--dt-colors-border-critical-default, rgba(196, 20, 37, 0.3))',
  },
  neutral: {
    background: 'var(--dt-colors-background-surface-default)',
    color: 'var(--dt-colors-text-neutral-default)',
    border: '1px solid var(--dt-colors-border-neutral-default)',
  },
  warning: {
    background: 'var(--dt-colors-background-warning-subtle, rgba(229, 190, 1, 0.1))',
    color: 'var(--dt-colors-text-warning-default, #7a5800)',
    border: '1px solid var(--dt-colors-border-warning-default, rgba(229, 190, 1, 0.4))',
  },
  primary: {
    background: 'var(--dt-colors-background-primary-subtle, rgba(29, 107, 204, 0.08))',
    color: 'var(--dt-colors-text-primary-default, #1d6bcc)',
    border: '1px solid var(--dt-colors-border-primary-default, rgba(29, 107, 204, 0.3))',
  },
};

export function SummaryCard({ count, label, variant }: SummaryCardProps) {
  const { background, color, border } = VARIANT_STYLES[variant];
  return (
    <div
      style={{
        background,
        border,
        borderRadius: 'var(--dt-borders-radius-surface-default, 4px)',
        padding: '8px 12px',
        flex: '1 1 90px',
        minWidth: 80,
      }}
    >
      <Text textStyle='base-emphasized' style={{ color, fontSize: '1.5rem', display: 'block', lineHeight: 1.1 }}>
        {count}
      </Text>
      <Text textStyle='small' style={{ color, fontSize: '0.75rem' }}>
        {label}
      </Text>
    </div>
  );
}
