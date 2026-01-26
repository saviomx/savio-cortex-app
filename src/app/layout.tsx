import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";
import { DealStagesProvider } from "@/contexts/deal-stages-context";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savio Cortex",
  description: "AI-powered CRM and WhatsApp communication platform for lead management and automation",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cortex",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <AuthProvider>
            <DealStagesProvider>
              {children}
            </DealStagesProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
