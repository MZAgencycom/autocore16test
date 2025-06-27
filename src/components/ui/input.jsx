import React from 'react';

const Input = React.forwardRef(({ className = '', ...props }, ref) => (
  <input ref={ref} className={`transition-shadow ${className}`} {...props} />
));
Input.displayName = 'Input';

export { Input };