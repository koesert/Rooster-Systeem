'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ModalConfig {
  type: 'confirm' | 'alert' | 'custom';
  title: string;
  message?: string;
  content?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCancel?: boolean;
  icon?: ReactNode;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ModalContextType {
  isOpen: boolean;
  config: ModalConfig | null;
  showModal: (config: ModalConfig) => void;
  hideModal: () => void;
  showConfirm: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'danger' | 'success';
    icon?: ReactNode;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  }) => void;
  showAlert: (options: {
    title: string;
    message: string;
    confirmText?: string;
    icon?: ReactNode;
    onConfirm?: () => void;
  }) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ModalConfig | null>(null);

  const showModal = (newConfig: ModalConfig) => {
    setConfig(newConfig);
    setIsOpen(true);
  };

  const hideModal = () => {
    setIsOpen(false);
    setTimeout(() => setConfig(null), 150); // Wait for animation
  };

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'danger' | 'success';
    icon?: ReactNode;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  }) => {
    showModal({
      type: 'confirm',
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Bevestigen',
      cancelText: options.cancelText || 'Annuleren',
      confirmVariant: options.variant || 'primary',
      showCancel: true,
      icon: options.icon,
      onConfirm: options.onConfirm,
      onCancel: options.onCancel
    });
  };

  const showAlert = (options: {
    title: string;
    message: string;
    confirmText?: string;
    icon?: ReactNode;
    onConfirm?: () => void;
  }) => {
    showModal({
      type: 'alert',
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'OK',
      showCancel: false,
      icon: options.icon,
      onConfirm: options.onConfirm
    });
  };

  const value = {
    isOpen,
    config,
    showModal,
    hideModal,
    showConfirm,
    showAlert,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};