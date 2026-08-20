import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "AI Service Demo", description: "Inspect an application-owned AI service checkout." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><header className="site-header"><a className="brand" href="/"><span>AI</span> Service Lab</a><div className="header-note">Customer story</div></header>{children}</body></html>;
}
