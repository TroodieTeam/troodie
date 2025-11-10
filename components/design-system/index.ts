/**
 * DESIGN SYSTEM EXPORT
 * Central export point for all design system components
 * Version 3.0
 */

// Core tokens and constants
export { DS } from './tokens';
export type { DesignSystem } from './tokens';

// Typography
export {
  Typography,
  H1,
  H2,
  H3,
  Body,
  BodySmall,
  Metadata,
  Caption,
  Link,
  ButtonText,
  ErrorText,
  SuccessText,
  Label,
} from './Typography';
export type {
  TypographyProps,
  TextVariant,
  TextColor,
  TextAlign,
  TextWeight,
} from './Typography';

// Layout
export {
  Spacer,
  Container,
  Row,
  Column,
  Screen,
  Card,
  Divider,
  spacing,
} from './Layout';
export type {
  SpacerProps,
  ContainerProps,
  RowProps,
  ColumnProps,
  ScreenProps,
  CardProps,
  DividerProps,
  SpacingSize,
  FlexAlign,
  FlexJustify,
} from './Layout';

// Buttons
export {
  Button,
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from './Button';
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
} from './Button';

// Avatar
export { Avatar } from './Avatar';
export type {
  AvatarProps,
  AvatarSize,
  AvatarVariant,
} from './Avatar';

// Restaurant Card
export { RestaurantCard } from './RestaurantCard';
export type { RestaurantCardProps } from './RestaurantCard';

// Empty States
export { EmptyState } from './EmptyState';
export type {
  EmptyStateProps,
  EmptyStateType,
} from './EmptyState';

// Skeletons
export {
  Skeleton,
  SkeletonGroup,
  RestaurantCardSkeleton,
  PostCardSkeleton,
  UserListItemSkeleton,
  ActivityItemSkeleton,
  TextLineSkeleton,
  AvatarSkeleton,
} from './Skeleton';
export type {
  SkeletonProps,
  SkeletonGroupProps,
} from './Skeleton';

// Utility exports for common patterns
export const DesignSystem = {
  // Quick access to all components
  Typography: {
    H1,
    H2,
    H3,
    Body,
    BodySmall,
    Metadata,
    Caption,
    Link,
    ButtonText,
    ErrorText,
    SuccessText,
    Label,
  },
  Layout: {
    Spacer,
    Container,
    Row,
    Column,
    Screen,
    Card,
    Divider,
  },
  Buttons: {
    Primary: PrimaryButton,
    Secondary: SecondaryButton,
    Text: TextButton,
  },
  Feedback: {
    EmptyState,
    Skeleton,
    SkeletonGroup,
  },
  // Quick access to tokens
  tokens: DS,
  spacing,
};

export default DesignSystem;