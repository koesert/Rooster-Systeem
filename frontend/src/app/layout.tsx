import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { ErrorProvider } from "@/contexts/ErrorContext";
import Modal from "@/components/Modal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Restaurant roster management systeem",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            <ModalProvider>
              <ErrorProvider>
                {children}
                <Modal />
              </ErrorProvider>
            </ModalProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
