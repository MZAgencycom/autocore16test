import React from 'react';

const Card = ({ className = '', ...props }) => (
  <div className={`bg-card rounded-xl border shadow-lg backdrop-blur-sm ${className}`} {...props} />
);
const CardHeader = ({ className = '', ...props }) => (
  <div className={`p-4 border-b ${className}`} {...props} />
);
const CardContent = ({ className = '', ...props }) => (
  <div className={`p-4 space-y-4 ${className}`} {...props} />
);
const CardFooter = ({ className = '', ...props }) => (
  <div className={`p-4 border-t ${className}`} {...props} />
);
const CardTitle = ({ className = '', ...props }) => (
  <h3 className={`font-semibold text-lg ${className}`} {...props} />
);
const CardDescription = ({ className = '', ...props }) => (
  <p className={`text-muted-foreground text-sm ${className}`} {...props} />
);

export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription };