import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface LoginFormProps {
  onLogin: () => void;
  onError: (message: string) => void;
  onShowSignUp: () => void;
  onSuccess?: (message: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onError, onShowSignUp, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          onError('Please check your email and click the verification link before signing in.');
        } else if (error.message.includes('Invalid login credentials')) {
          onError('Invalid email or password. Please check your credentials and try again.');
        } else {
          onError(error.message);
        }
      } else if (data.user) {
        onLogin();
      }
    } catch {
      onError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      onError('Please enter your email address');
      return;
    }

    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        onError(error.message);
      } else {
        onSuccess?.('Password reset email sent! Please check your inbox.');
        setShowForgotPassword(false);
        setResetEmail('');
      }
    } catch {
      onError('An unexpected error occurred while sending reset email');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4" style={{ backgroundColor: '#2E8A6A' }}>
            <span className="text-white font-bold text-base sm:text-lg">TH</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">THFCScan</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-1">Food Forward Portal</p>
          <p className="text-xs sm:text-sm text-gray-500">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label htmlFor="email" className="text-sm sm:text-base font-medium text-gray-700 block mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center">
                <Mail className="text-gray-400" size={18} />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-transparent text-sm sm:text-base"
                style={{ 
                  boxShadow: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2E8A6A';
                  e.target.style.boxShadow = '0 0 0 2px rgba(46, 138, 106, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-sm sm:text-base font-medium text-gray-700 block mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center">
                <Lock className="text-gray-400" size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-transparent text-sm sm:text-base"
                style={{ 
                  boxShadow: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2E8A6A';
                  e.target.style.boxShadow = '0 0 0 2px rgba(46, 138, 106, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 transition-colors touch-target p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-5">
            <p className="text-xs sm:text-sm text-green-800 leading-relaxed">
              • Alternatively, you can email{' '}
              <a 
                href="mailto:support@thehealthfoodcompany.co.za" 
                className="font-medium underline hover:text-green-900"
              >
                support@thehealthfoodcompany.co.za
              </a>
              {' '}to request a temporary login code. This code will be valid for 7 days.
            </p>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 sm:py-4 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors touch-target text-sm sm:text-base"
            style={{ 
              backgroundColor: !isLoading ? '#FA5D00' : undefined
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#e54d00';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#FA5D00';
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center space-y-2 sm:space-y-3 mt-4 sm:mt-5">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="block text-xs sm:text-sm hover:underline touch-target"
              style={{ color: '#2E8A6A' }}
            >
              Forgot Password?
            </button>
            <div className="text-xs sm:text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onShowSignUp}
                className="hover:underline font-medium touch-target"
                style={{ color: '#2E8A6A' }}
              >
                Sign Up
              </button>
            </div>
            <div className="pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="text-xs sm:text-sm hover:underline font-medium touch-target"
                style={{ color: '#2E8A6A' }}
              >
                Admin Login
              </button>
            </div>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reset Password</h2>
              <p className="text-sm text-gray-600 mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="resetEmail" className="text-sm font-medium text-gray-700 block mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center">
                      <Mail className="text-gray-400" size={18} />
                    </div>
                    <input
                      type="email"
                      id="resetEmail"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-transparent text-sm"
                      style={{ 
                        boxShadow: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2E8A6A';
                        e.target.style.boxShadow = '0 0 0 2px rgba(46, 138, 106, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder="Enter your email"
                      required
                      disabled={isResetting}
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    disabled={isResetting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white font-semibold rounded-lg transition-colors text-sm"
                    style={{ 
                      backgroundColor: !isResetting ? '#2E8A6A' : '#9CA3AF'
                    }}
                    onMouseEnter={(e) => {
                      if (!isResetting) {
                        e.currentTarget.style.backgroundColor = '#236B56';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isResetting) {
                        e.currentTarget.style.backgroundColor = '#2E8A6A';
                      }
                    }}
                    disabled={isResetting}
                  >
                    {isResetting ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

export default LoginForm;