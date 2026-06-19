import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const jakarta = localFont({
  src: [
    {
      path: "../public/fonts/PlusJakartaSans-Regular.ttf",
      weight: "400",
      style: "normal"
    },
    {
      path: "../public/fonts/PlusJakartaSans-Medium.ttf",
      weight: "500",
      style: "normal"
    },
    {
      path: "../public/fonts/PlusJakartaSans-SemiBold.ttf",
      weight: "600",
      style: "normal"
    },
    {
      path: "../public/fonts/PlusJakartaSans-Bold.ttf",
      weight: "700",
      style: "normal"
    },
    {
      path: "../public/fonts/PlusJakartaSans-ExtraBold.ttf",
      weight: "800",
      style: "normal"
    }
  ],
  variable: "--font-jakarta",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://leankly.com"),
  title: "Leankly | Side Questing For The Plot",
  description:
    "Leankly helps you discover Leanks, meet nearby people, and turn everyday ideas into shared experiences.",
  icons: {
    icon: "/brand/favicon.png"
  },
  openGraph: {
    title: "Leankly",
    description: "Side Questing For The Plot",
    images: ["/brand/leankly-plus-header.png"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
