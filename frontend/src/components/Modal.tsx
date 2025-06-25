'use client';

import React, { useEffect, useState } from 'react';
import { useModal } from '@/contexts/ModalContext';
import { X } from 'lucide-react';

export default function Modal() {
  const { isOpen, config, hideModal } = useModal();
  const [isLoading, setIsLoading] = useState(false);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        hideModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, hideModal]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !config) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      hideModal();
    }
  };

  const handleConfirm = async () => {
    if (config.onConfirm) {
      setIsLoading(true);
      try {
        await config.onConfirm();
        hideModal();
      } catch (error) {
        console.error('Modal confirm error:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      hideModal();
    }
  };

  const handleCancel = () => {
    if (config.onCancel) {
      config.onCancel();
    }
    hideModal();
  };

  const getModalSize = () => {
    switch (config.size) {
      case 'sm': return 'max-w-sm';
      case 'lg': return 'max-w-lg';
      case 'xl': return 'max-w-xl';
      default: return 'max-w-md';
    }
  };

  const getButtonStyle = (variant: string) => {
    switch (variant) {
      case 'danger':
        return {
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          hover: 'linear-gradient(135deg, #dc2626, #b91c1c)'
        };
      case 'success':
        return {
          background: 'linear-gradient(135deg, #10b981, #059669)',
          hover: 'linear-gradient(135deg, #059669, #047857)'
        };
      default:
        return {
          background: 'linear-gradient(135deg, #d5896f, #d5896f90)',
          hover: 'linear-gradient(135deg, #c17c5e, #d5896f)'
        };
    }
  };

  const buttonStyle = getButtonStyle(config.confirmVariant || 'primary');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={handleBackdropClick}
    >
      {/* Backdrop blur effect */}
      <div className="absolute inset-0 backdrop-blur-[4px]"></div>

      {/* Modal content */}
      <div
        className={`relative bg-white/95 backdrop-blur-[4px] rounded-2xl shadow-2xl border border-white/20 w-full ${getModalSize()} transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
          }`}
        style={{
          boxShadow: '0 25px 50px rgba(103, 105, 124, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full blur-2xl opacity-8" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>

        {/* Close button */}
        <button
          onClick={hideModal}
          className="absolute top-4 right-4 p-2 rounded-lg bg-gray-100/80 hover:bg-gray-200/80 transition-colors duration-200 z-10 cursor-pointer"
          disabled={isLoading}
        >
          <X className="h-4 w-4" style={{ color: '#67697c' }} />
        </button>

        {/* Modal content */}
        <div className="relative z-10 p-8">
          {/* Header */}
          <div className="flex items-start space-x-4 mb-6">
            {config.icon && (
              <div className="flex-shrink-0 p-3 rounded-xl" style={{
                background: config.confirmVariant === 'danger'
                  ? 'linear-gradient(135deg, #ef444420, #ef444410)'
                  : config.confirmVariant === 'success'
                    ? 'linear-gradient(135deg, #10b98120, #10b98110)'
                    : 'linear-gradient(135deg, #d5896f20, #d5896f10)'
              }}>
                {config.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold mb-2" style={{ color: '#120309' }}>
                {config.title}
              </h3>
              {config.message && (
                <p className="text-sm leading-relaxed" style={{ color: '#67697c' }}>
                  {config.message}
                </p>
              )}
            </div>
          </div>

          {/* Custom content */}
          {config.content && (
            <div className="mb-6">
              {config.content}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            {config.showCancel && (
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-6 py-3 rounded-xl border border-gray-300 bg-white/60 hover:bg-white/80 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ color: '#67697c' }}
              >
                {config.cancelText}
              </button>
            )}

            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl text-white font-semibold transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-2"
              style={{ background: buttonStyle.background }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = buttonStyle.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = buttonStyle.background;
                }
              }}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Laden...</span>
                </>
              ) : (
                <span>{config.confirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(16px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes modalOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.95) translateY(16px);
          }
        }
      `}</style>
    </div>
  );
}