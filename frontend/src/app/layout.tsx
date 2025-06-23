import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModalProvider } from '@/contexts/ModalContext';
import Modal from '@/components/Modal';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Jill Dashboard',
  description: 'Restaurant roster management systeem',
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
          <ModalProvider>
            {children}
            <Modal />
          </ModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}