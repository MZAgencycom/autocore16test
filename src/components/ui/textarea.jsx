import React from 'react';

const Textarea = React.forwardRef(({ className = '', ...props }, ref) => (
  <textarea ref={ref} className={`transition-shadow ${className}`} {...props} />
));
Textarea.displayName = 'Textarea';

export { Textarea };