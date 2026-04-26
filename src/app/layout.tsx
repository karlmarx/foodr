import type { Metadata } from "next";
import "./globals.css";
import { FoodrProvider } from "@/lib/FoodrProvider";

export const metadata: Metadata = {
  title: "foodr — fast food on its own scale",
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
      <body className="min-h-screen">
        <FoodrProvider>{children}</FoodrProvider>
      </body>
    </html>
  );
}
