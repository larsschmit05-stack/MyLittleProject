import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Operational Process Modeler",
  description: "Visual capacity flow builder for operational process modeling",
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
