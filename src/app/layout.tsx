import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWH Album",
  description: "Disposable camera and shared event album for private celebrations."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
