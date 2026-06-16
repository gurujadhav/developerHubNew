import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchDark — Deploy & Run",
  description: "Deploy and run your Next.js apps with GitHub-powered infrastructure",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
