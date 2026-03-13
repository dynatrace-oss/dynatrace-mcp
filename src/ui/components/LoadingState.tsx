import { Flex } from '@dynatrace/strato-components/layouts';
import { ProgressCircle } from '@dynatrace/strato-components/content';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <Flex justifyContent='center' alignItems='center' padding={32}>
      <ProgressCircle>{message}</ProgressCircle>
    </Flex>
  );
}
