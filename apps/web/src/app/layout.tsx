import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Mundo Dodgeball",
  description: "Mundo Dodgeball web game"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
