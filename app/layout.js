import { ClerkProvider } from "@clerk/nextjs";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "BookVerse — Your reading life, beautifully kept.",
  description:
    "A personal reading archive with a living constellation of your books, journals, and literary connections.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
