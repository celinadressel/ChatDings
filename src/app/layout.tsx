import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat-Dings – Messenger",
  description: "Ein moderner Web-Messenger auf Basis von Next.js und Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
