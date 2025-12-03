/**
 * Component Type Definitions - Production-Grade Type Safety
 * 
 * Comprehensive type system for React components and UI utilities.
 * Eliminates 'any' types with precise TypeScript definitions.
 * 
 * @module types/components.types
 */

import type { ReactNode } from 'react';
import type { JSONValue } from './common.types';

// =====================================================
// CHART TYPES
// =====================================================

/**
 * Chart tooltip payload entry
 */
export interface ChartTooltipPayload<T = JSONValue> {
  name: string;
  value: number | string;
  color: string;
  dataKey: string;
  payload: T;
  unit?: string;
}

/**
 * Chart tooltip props (Recharts compatible)
 */
export interface ChartTooltipProps<T = JSONValue> {
  active?: boolean;
  payload?: ChartTooltipPayload<T>[];
  label?: string | number;
  coordinate?: { x: number; y: number };
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  [key: string]: string | number | undefined;
}

/**
 * Chart axis configuration
 */
export interface ChartAxisConfig {
  dataKey?: string;
  stroke?: string;
  style?: React.CSSProperties;
  label?: {
    value: string;
    angle?: number;
    position?: string;
    fill?: string;
  };
}

/**
 * Chart legend configuration
 */
export interface ChartLegendConfig {
  wrapperStyle?: React.CSSProperties;
  iconType?: 'line' | 'rect' | 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye';
}

// =====================================================
// WINDOW AUGMENTATION TYPES
// =====================================================

/**
 * iOS standalone mode detection
 */
export interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

/**
 * Window with MSStream detection (for iOS check)
 */
export interface WindowWithMSStream extends Window {
  MSStream?: unknown;
}

// =====================================================
// ASYNC COMPONENT TYPES
// =====================================================

/**
 * Async component state status
 */
export type AsyncComponentStatus = 'loading' | 'success' | 'error' | 'empty';

/**
 * Async component state
 */
export interface AsyncComponentState<T> {
  status: AsyncComponentStatus;
  data: T | null;
  error: string | null;
}

/**
 * Async component action configuration
 */
export interface AsyncComponentAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: ReactNode;
}

/**
 * Empty state check function
 */
export type EmptyStateCheck<T> = (data: T) => boolean;

/**
 * Data fetcher function
 */
export type DataFetcher<T> = () => Promise<T>;

// =====================================================
// TAB TYPES
// =====================================================

/**
 * Tab identifier
 */
export type TabId = string;

/**
 * Tab configuration
 */
export interface TabConfig {
  id: TabId;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  badge?: string | number;
}

/**
 * Tab panel props
 */
export interface TabPanelProps {
  value: TabId;
  index: TabId;
  children: ReactNode;
}

// =====================================================
// MODAL/DIALOG TYPES
// =====================================================

/**
 * Modal size variants
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Modal props
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

// =====================================================
// FORM TYPES
// =====================================================

/**
 * Form field value
 */
export type FormFieldValue = string | number | boolean | null | undefined | string[];

/**
 * Form values object
 */
export interface FormValues {
  [key: string]: FormFieldValue;
}

/**
 * Form validation error
 */
export interface FormValidationError {
  field: string;
  message: string;
  type?: 'required' | 'pattern' | 'min' | 'max' | 'custom';
}

/**
 * Form validation result
 */
export interface FormValidationResult {
  valid: boolean;
  errors: FormValidationError[];
}

/**
 * Form field validator
 */
export type FormFieldValidator = (value: FormFieldValue) => string | null;

/**
 * Form submit handler
 */
export type FormSubmitHandler<T extends FormValues = FormValues> = (
  values: T
) => Promise<void> | void;

// =====================================================
// NOTIFICATION/TOAST TYPES
// =====================================================

/**
 * Notification type
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Notification position
 */
export type NotificationPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-center' 
  | 'bottom-right';

/**
 * Notification configuration
 */
export interface NotificationConfig {
  id?: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  position?: NotificationPosition;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// =====================================================
// DROPDOWN/SELECT TYPES
// =====================================================

/**
 * Select option
 */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
  description?: string;
}

/**
 * Select group
 */
export interface SelectGroup<T = string> {
  label: string;
  options: SelectOption<T>[];
}

/**
 * Select change handler
 */
export type SelectChangeHandler<T = string> = (value: T) => void;

// =====================================================
// TABLE TYPES
// =====================================================

/**
 * Table column definition
 */
export interface TableColumn<T = Record<string, unknown>> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => ReactNode;
}

/**
 * Table sort direction
 */
export type TableSortDirection = 'asc' | 'desc';

/**
 * Table sort state
 */
export interface TableSortState {
  column: string;
  direction: TableSortDirection;
}

/**
 * Table pagination state
 */
export interface TablePaginationState {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Table row selection state
 */
export interface TableSelectionState<T = unknown> {
  selectedRows: Set<string | number>;
  isAllSelected: boolean;
  getRowId: (row: T) => string | number;
}

// =====================================================
// LOADING STATE TYPES
// =====================================================

/**
 * Loading state variant
 */
export type LoadingVariant = 'spinner' | 'skeleton' | 'pulse' | 'dots';

/**
 * Loading state size
 */
export type LoadingSize = 'sm' | 'md' | 'lg';

/**
 * Loading state props
 */
export interface LoadingStateProps {
  message?: string;
  variant?: LoadingVariant;
  size?: LoadingSize;
  fullScreen?: boolean;
}

// =====================================================
// ERROR STATE TYPES
// =====================================================

/**
 * Error severity
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Error state props
 */
export interface ErrorStateProps {
  title?: string;
  message: string;
  severity?: ErrorSeverity;
  onRetry?: () => void;
  retryLabel?: string;
  details?: string;
  showDetails?: boolean;
}

// =====================================================
// EMPTY STATE TYPES
// =====================================================

/**
 * Empty state props
 */
export interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: ReactNode;
  action?: AsyncComponentAction;
  illustration?: ReactNode;
}

// =====================================================
// BADGE/CHIP TYPES
// =====================================================

/**
 * Badge variant
 */
export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

/**
 * Badge size
 */
export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Badge props
 */
export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

// =====================================================
// AVATAR TYPES
// =====================================================

/**
 * Avatar size
 */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Avatar props
 */
export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  rounded?: boolean;
  fallback?: ReactNode;
}

// =====================================================
// CARD TYPES
// =====================================================

/**
 * Card variant
 */
export type CardVariant = 'default' | 'outlined' | 'elevated' | 'filled';

/**
 * Card props
 */
export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
}

// =====================================================
// ACCORDION TYPES
// =====================================================

/**
 * Accordion item
 */
export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
}

/**
 * Accordion props
 */
export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultExpanded?: string[];
  onChange?: (expandedIds: string[]) => void;
}

// =====================================================
// BREADCRUMB TYPES
// =====================================================

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
}

/**
 * Breadcrumb props
 */
export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  maxItems?: number;
}

// =====================================================
// PROGRESS TYPES
// =====================================================

/**
 * Progress variant
 */
export type ProgressVariant = 'linear' | 'circular';

/**
 * Progress props
 */
export interface ProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  color?: string;
}

// =====================================================
// TOOLTIP TYPES
// =====================================================

/**
 * Tooltip placement
 */
export type TooltipPlacement = 
  | 'top' 
  | 'top-start' 
  | 'top-end' 
  | 'bottom' 
  | 'bottom-start' 
  | 'bottom-end' 
  | 'left' 
  | 'left-start' 
  | 'left-end' 
  | 'right' 
  | 'right-start' 
  | 'right-end';

/**
 * Tooltip props
 */
export interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  disabled?: boolean;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Component with children
 */
export interface WithChildren {
  children: ReactNode;
}

/**
 * Component with className
 */
export interface WithClassName {
  className?: string;
}

/**
 * Component with style
 */
export interface WithStyle {
  style?: React.CSSProperties;
}

/**
 * Component with testId
 */
export interface WithTestId {
  testId?: string;
  'data-testid'?: string;
}

/**
 * Common component props
 */
export interface CommonComponentProps extends WithChildren, WithClassName, WithStyle, WithTestId {}
