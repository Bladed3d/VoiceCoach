import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // Base button styles (from design system CSS classes)
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 min-h-[44px]", // 44px minimum for desktop accessibility
  {
    variants: {
      variant: {
        primary: "btn-primary",
        secondary: "btn-secondary", 
        ghost: "btn-ghost",
        destructive: "bg-error-500 hover:bg-error-600 text-white focus-visible:ring-error-500",
      },
      size: {
        sm: "h-9 px-3 text-small",
        md: "h-11 px-4 text-body", 
        lg: "h-12 px-6 text-body",
        xl: "h-14 px-8 text-h3",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };