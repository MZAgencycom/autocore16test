import React from 'react';

const Select = ({ value, onValueChange, children, ...props }) => (
  <select
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    className="transition-shadow"
    {...props}
  >
    {children}
  </select>
);

const SelectContent = ({ children }) => <>{children}</>;
const SelectTrigger = ({ children }) => <>{children}</>;
const SelectValue = ({ placeholder }) => (
  <option value="" disabled hidden>{placeholder}</option>
);
const SelectItem = ({ value, children }) => (
  <option value={value}>{children}</option>
);

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
