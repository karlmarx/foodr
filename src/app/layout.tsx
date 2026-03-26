import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foodr - Fast Food on Its Own Scale",
  description:
    "Rate fast food chains on their own scale. Because every Wendy's deserves to be judged as a Wendy's.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
