import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  "inline-flex items-center px-2 py-1 text-caption font-medium rounded-full transition-colors duration-fast",
  {
    variants: {
      variant: {
        default: "bg-neutral-700 text-neutral-200",
        success: "bg-success-500/20 text-success-500 border border-success-500/30",
        error: "bg-error-500/20 text-error-500 border border-error-500/30",
        warning: "bg-warning-500/20 text-warning-500 border border-warning-500/30",
        info: "bg-info-500/20 text-info-500 border border-info-500/30",
        urgent: "bg-urgent/20 text-urgent border border-urgent/30",
        helpful: "bg-helpful/20 text-helpful border border-helpful/30",
        background: "bg-background/20 text-background border border-background/30",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2 py-1 text-caption",
        lg: "px-3 py-1 text-small",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, dot = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <div 
            className={cn(
              "w-2 h-2 rounded-full mr-1.5 flex-shrink-0",
              variant === 'success' && "bg-success-500",
              variant === 'error' && "bg-error-500", 
              variant === 'warning' && "bg-warning-500",
              variant === 'info' && "bg-info-500",
              variant === 'urgent' && "bg-urgent",
              variant === 'helpful' && "bg-helpful",
              variant === 'background' && "bg-background",
              variant === 'default' && "bg-neutral-400"
            )}
          />
        )}
        {children}
      </div>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };