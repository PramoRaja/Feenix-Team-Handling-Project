import React from 'react';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Feenix Web Administration</title>
      </head>
      <body>
        <ThemeProvider>
            {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
