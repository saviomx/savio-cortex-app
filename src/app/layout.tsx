import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savio - AI Sales Development",
  description: "AI-powered sales development platform",
  icons: {
    icon: "/savio-logo-DdP6MEtP.png",
    apple: "/savio-logo-DdP6MEtP.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
