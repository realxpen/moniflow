import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * MONIFlow's static web document, shared by PWA-installed and browser testing.
 * No authentication token, wallet data or account content is embedded here.
 * The document contains install metadata, not a separate financial app.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#19191B" />
        <meta
          name="description"
          content="MONIFlow Sandbox: safely test Money Plans, MONI Guard, Pockets and Activity. All money is simulated."
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MONIFlow" />
        <meta name="application-name" content="MONIFlow" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/svg+xml" href="/moniflow-icon.svg" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
