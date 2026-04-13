import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM WhatsTask",
  description: "Multi-tenant CRM platform for service businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${urbanist.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-urbanist)] bg-gray-950 text-gray-100">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
