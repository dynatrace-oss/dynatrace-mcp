import { Button } from '@dynatrace/strato-components/buttons';

export type ChartVariant = 'line' | 'area';
export type ViewMode = 'table' | 'chart';

/**
 * Props for the ChartButton component.
 */
interface ChartButtonProps {
  /** The chart variant this button represents (e.g., 'line' or 'area') */
  mode: ChartVariant;
  /** Icon to display in the button prefix */
  icon: React.ReactNode;
  /** Button label text */
  label: string;
  /** Whether the button should be disabled (typically when no chart data is available) */
  disabled?: boolean;
  /** Current active view mode (table or chart) */
  currentViewMode: ViewMode;
  /** Current active chart variant */
  currentChartVariant: ChartVariant;
  /** Callback fired when the button is clicked, receives the chart mode */
  onClick: (mode: ChartVariant) => void;
}

/**
 * A specialized button component for switching between different chart visualization modes.
 *
 * This component was extracted from ExecuteDqlApp to reduce code duplication and improve
 * maintainability. Previously, the chart buttons (Line, Area) had nearly identical
 * implementation with only minor differences in variant, icon, and mode.
 *
 * The button automatically determines if it should show as "active" (accent variant) based on
 * the current view mode and chart variant. It also handles disabled states with appropriate
 * tooltips when charting is not available.
 *
 * @example
 * ```tsx
 * <ChartButton
 *   mode='line'
 *   icon={<LineChartIcon />}
 *   label='Line'
 *   disabled={!canChart}
 *   currentViewMode={viewMode}
 *   currentChartVariant={chartVariant}
 *   onClick={(mode) => {
 *     setViewMode('chart');
 *     setChartVariant(mode);
 *   }}
 * />
 * ```
 */
export function ChartButton({
  mode,
  icon,
  label,
  disabled = false,
  currentViewMode,
  currentChartVariant,
  onClick,
}: ChartButtonProps) {
  const isActive = currentViewMode === 'chart' && currentChartVariant === mode;
  const title = disabled ? 'No numeric columns available for charting' : `Switch to ${mode} chart view`;

  return (
    <Button
      variant={isActive ? 'accent' : 'default'}
      size='condensed'
      onClick={() => onClick(mode)}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <Button.Prefix>{icon}</Button.Prefix>
      {label}
    </Button>
  );
}
