import { Container } from '@dynatrace/strato-components/layouts';
import { Text } from '@dynatrace/strato-components/typography';

export type SummaryCardVariant = 'critical' | 'neutral' | 'warning' | 'primary';

interface SummaryCardProps {
  count: number | string;
  label: string;
  variant: SummaryCardVariant;
}

export function SummaryCard({ count, label, variant }: SummaryCardProps) {
  const isAccent = variant !== 'neutral';
  return (
    <Container
      variant={isAccent ? 'accent' : 'default'}
      color={variant}
      paddingY={8}
      paddingX={12}
      style={{ flex: '1 1 90px', minWidth: 80 }}
    >
      <Text textStyle='base-emphasized' style={{ fontSize: '1.5rem', display: 'block', lineHeight: 1.1 }}>
        {count}
      </Text>
      <Text textStyle='small' style={{ fontSize: '0.75rem' }}>
        {label}
      </Text>
    </Container>
  );
}
