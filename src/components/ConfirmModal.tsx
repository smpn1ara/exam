import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  isAlertOnly?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'warning',
  onConfirm,
  onCancel,
  isAlertOnly = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
      case 'info':
        return <HelpCircle className="w-6 h-6 text-blue-600" />;
      case 'warning':
      default:
        return <AlertCircle className="w-6 h-6 text-amber-600" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20';
      case 'warning':
      default:
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-bold text-slate-800 text-base leading-tight font-heading">
              {title}
            </h3>
            <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              {message}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          {!isAlertOnly && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
