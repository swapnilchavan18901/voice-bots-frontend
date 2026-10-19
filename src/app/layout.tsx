import { THEME_KEY, LEGACY_THEME_KEY, PRODUCT_NAME } from "@/constants/constants";
import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — Voice agent studio`,
  description:
    "Create, personalize, and connect voice agents for your business.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem('${THEME_KEY}')||localStorage.getItem('${LEGACY_THEME_KEY}');if(p==='light'||p==='dark')localStorage.setItem('${THEME_KEY}',p);document.documentElement.dataset.theme=p==='light'||p==='dark'?p:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
