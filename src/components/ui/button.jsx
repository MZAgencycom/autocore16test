import React from 'react';

const Button = React.forwardRef(({ variant = 'primary', className = '', ...props }, ref) => {
  let variantClass = 'btn-primary';
  if (variant === 'outline') variantClass = 'btn-outline';
  else if (variant === 'secondary') variantClass = 'btn-secondary';
  return (
    <button
      ref={ref}
      className={`${variantClass} ${className}`}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export { Button };