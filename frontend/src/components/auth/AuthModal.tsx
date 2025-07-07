'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp, loading, error } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'signup') {
      if (!formData.username) {
        newErrors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Username can only contain letters, numbers, and underscores';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (mode === 'signin') {
        const { error } = await signIn(formData.email, formData.password);
        if (!error) {
          onClose();
        }
      } else {
        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.username,
          formData.displayName || undefined
        );
        if (!error) {
          onClose();
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setFormData({ email: '', password: '', username: '', displayName: '' });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          <div className="relative w-full max-w-md mx-4 glass backdrop-blur-[20px] bg-ash-900/90 border border-white/20 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                {mode === 'signin' ? 'Welcome Back' : 'Join WeAnime'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-ash-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-ash-300 mt-2">
              {mode === 'signin' 
                ? 'Sign in to access your anime library and continue watching'
                : 'Create an account to start building your anime collection'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-ash-200 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-ash-400 focus:outline-none focus:border-purple-400 transition-colors"
                    placeholder="Enter your username"
                  />
                  {errors.username && (
                    <p className="text-red-400 text-sm mt-1">{errors.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-ash-200 mb-2">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-ash-400 focus:outline-none focus:border-purple-400 transition-colors"
                    placeholder="Enter your display name"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-ash-200 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-ash-400 focus:outline-none focus:border-purple-400 transition-colors"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-ash-200 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-ash-400 focus:outline-none focus:border-purple-400 transition-colors"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-ash-600 disabled:to-ash-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>

            <div className="text-center">
              <p className="text-ash-400">
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                {' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}