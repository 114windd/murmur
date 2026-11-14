import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Murmur — room for your thoughts",
  description:
    "A private little notebook for voice notes, growing ideas, and gentle reminders.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
