import { Tooltip } from '@dynatrace/strato-components-preview/overlays';

interface MetadataIconProps {
  icon: React.ReactNode;
  tooltip: string;
  warning?: boolean;
}

const METADATA_ICON_OPACITY = 0.7;

/**
 * Small icon with a hover tooltip and accessibility support.
 *
 * This component displays an icon with visual feedback (tooltip, color, opacity)
 * to convey metadata information in a compact way. It's commonly used to show
 * query metrics like scanned records, bytes, budget info, and warnings.
 *
 * Uses Strato's Tooltip component for accessible tooltips that work with keyboard
 * navigation and screen readers. The icon's semantics are preserved by removing
 * the redundant role='img' and relying on the icon component's native ARIA attributes.
 *
 * @example
 * ```tsx
 * import { DataTableIcon, WarningIcon } from '@dynatrace/strato-icons';
 *
 * // Display scanned records info
 * <MetadataIcon
 *   icon={<DataTableIcon />}
 *   tooltip={`Scanned Records: 1,234`}
 * />
 *
 * // Display a warning with highlighted color
 * <MetadataIcon
 *   icon={<WarningIcon />}
 *   tooltip="Query exceeded time limit"
 *   warning
 * />
 * ```
 */
export function MetadataIcon({ icon, tooltip, warning = false }: MetadataIconProps) {
  return (
    <Tooltip text={tooltip}>
      <span
        aria-label={tooltip}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          cursor: 'default',
          opacity: METADATA_ICON_OPACITY,
          color: warning ? 'var(--dt-colors-text-warning-default, #e5be01)' : 'inherit',
        }}
      >
        {icon}
      </span>
    </Tooltip>
  );
}
