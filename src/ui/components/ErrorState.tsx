import { Text } from '@dynatrace/strato-components/typography';
import { Surface } from '@dynatrace/strato-components/layouts';

interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <Surface padding={16}>
      <Text textStyle='base' style={{ color: 'var(--dt-colors-text-critical-default, #c41425)' }}>
        {message}
      </Text>
    </Surface>
  );
}
