import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travelly — A Gift For You",
  description: "A cinematic journey through our travel photos",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full w-full antialiased" style={{ background: "#FAF7F2" }}>
        {children}
      </body>
    </html>
  );
}
