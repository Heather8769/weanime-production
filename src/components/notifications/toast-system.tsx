'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface Toast {
  id: string
  title?: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast component
function ToastComponent({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-400/30'
      case 'error':
        return 'border-red-400/30'
      case 'warning':
        return 'border-yellow-400/30'
      case 'info':
        return 'border-blue-400/30'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={cn(
        'glass-modal rounded-xl p-4 border shadow-lg max-w-sm w-full',
        getBorderColor()
      )}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">{getIcon()}</div>
        
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-sm font-medium text-white">{toast.title}</p>
          )}
          <p className={cn(
            'text-sm text-white/80',
            toast.title ? 'mt-1' : ''
          )}>
            {toast.message}
          </p>
          
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={toast.action.onClick}
                className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

// Toast container
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Toast provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11)
    const newToast: Toast = { ...toast, id }

    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// Convenience hooks for different toast types
export function useToastHelpers() {
  const { addToast } = useToast()

  return {
    success: (message: string, title?: string, options?: Partial<Toast>) =>
      addToast({ type: 'success', message, title, ...options }),
    
    error: (message: string, title?: string, options?: Partial<Toast>) =>
      addToast({ type: 'error', message, title, ...options }),
    
    warning: (message: string, title?: string, options?: Partial<Toast>) =>
      addToast({ type: 'warning', message, title, ...options }),
    
    info: (message: string, title?: string, options?: Partial<Toast>) =>
      addToast({ type: 'info', message, title, ...options }),
  }
}

// Progress toast for long operations
export function useProgressToast() {
  const { addToast, removeToast } = useToast()

  const showProgress = useCallback((message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 11)
    
    addToast({
      type: 'info',
      message,
      title,
      duration: 0, // Don't auto-remove
    })
    
    return {
      update: (newMessage: string, newTitle?: string) => {
        removeToast(id)
        addToast({
          type: 'info',
          message: newMessage,
          title: newTitle,
          duration: 0,
        })
      },
      success: (successMessage: string, successTitle?: string) => {
        removeToast(id)
        addToast({
          type: 'success',
          message: successMessage,
          title: successTitle,
        })
      },
      error: (errorMessage: string, errorTitle?: string) => {
        removeToast(id)
        addToast({
          type: 'error',
          message: errorMessage,
          title: errorTitle,
        })
      },
      remove: () => removeToast(id),
    }
  }, [addToast, removeToast])

  return { showProgress }
}
