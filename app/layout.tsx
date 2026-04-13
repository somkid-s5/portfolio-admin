import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthSessionBridge } from "@/components/auth-session-bridge";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Smart Admin Panel",
    template: "%s | Admin Panel",
  },
  description:
    "A modern admin panel for managing your portfolio projects and certifications.",
  keywords: ["portfolio", "admin", "cms", "projects", "certifications"],
  authors: [{ name: "Smart" }],
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/Slogo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://vmhlmcwsylkpxzkjmjix.supabase.co"
        />
      </head>
      <body className="antialiased">
        <AuthSessionBridge />
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
