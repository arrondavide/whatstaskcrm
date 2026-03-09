import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/providers/auth-provider";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CRM WhatsTask",
  description: "Multi-tenant white-label CRM platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={urbanist.className}>
        <AuthProvider>
        {children}
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            className: "!bg-card !text-card-foreground !border !border-border",
          }}
        />
      </body>
    </html>
  );
}
