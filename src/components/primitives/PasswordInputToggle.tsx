'use client';

import { forwardRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showToggle?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showToggle = true, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          disabled={disabled}
          className={cn('pr-12 [&::-ms-reveal]:hidden', className)}
          {...props}
        />
        {showToggle && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:bg-transparent"
            onMouseDown={(e) => {
              e.preventDefault(); // Keeps focus on the input so you can keep typing
              setShowPassword((prev) => !prev);
            }}
            disabled={disabled}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };