import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "문도피구",
  description: "문도피구 웹 게임"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
