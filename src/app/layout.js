import React from 'react';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Feenix Web Administration</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="application-name" content="Feenix Portal" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Feenix Portal" />
        <meta name="theme-color" content="#0b0f19" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/feenix-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('feenix_theme');
                var userChose = localStorage.getItem('feenix_theme_user_set');
                var active = userChose ? (saved || 'light') : 'light';
                if (active === 'dark') {
                  document.documentElement.classList.add('dark-mode');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.add('light-mode');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch(e) {}
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    if (reg) {
                      reg.update().catch(function() {});
                      reg.onupdatefound = function() {
                        var installing = reg.installing;
                        if (installing) {
                          installing.onstatechange = function() {
                            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                              window.location.reload();
                            }
                          };
                        }
                      };
                    }
                  }).catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
            {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
