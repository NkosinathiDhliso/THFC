import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface ResetPasswordPageProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onError, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if we have the required tokens from the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    if (type !== 'recovery' || !accessToken || !refreshToken) {
      onError('Invalid or expired reset link. Please request a new password reset.');
      navigate('/login');
      return;
    }

    // Set the session with the tokens from the URL
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    }).catch((error) => {
      console.error('Error setting session:', error);
      onError('Invalid or expired reset link. Please request a new password reset.');
      navigate('/login');
    });
  }, [searchParams, navigate, onError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      onError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      onError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        onError(error.message);
      } else {
        setIsSuccess(true);
        onSuccess('Password updated successfully! You can now sign in with your new password.');
        
        // Sign out the user and redirect to login after a delay
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate('/login');
        }, 3000);
      }
    } catch {
      onError('An unexpected error occurred while updating your password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Password Updated!</h1>
              <p className="text-sm text-gray-600 mb-4">
                Your password has been successfully updated. You will be redirected to the login page shortly.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-white font-semibold rounded-lg transition-colors text-sm"
                style={{ backgroundColor: '#2E8A6A' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#236B56';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2E8A6A';
                }}
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--color-primary-brand)] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Lock size={28} className="text-white sm:w-8 sm:h-8" />
            </div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
            <p className="text-sm sm:text-base text-gray-600">Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="password" className="text-sm sm:text-base font-medium text-gray-700 block mb-2">
                New Password
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
                  placeholder="Enter new password"
                  required
                  disabled={isLoading}
                  minLength={6}
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
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="text-sm sm:text-base font-medium text-gray-700 block mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center">
                  <Lock className="text-gray-400" size={18} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  placeholder="Confirm new password"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 transition-colors touch-target p-1"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 sm:py-4 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors touch-target text-sm sm:text-base"
              style={{ 
                backgroundColor: !isLoading ? '#2E8A6A' : undefined
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#236B56';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#2E8A6A';
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-xs sm:text-sm hover:underline touch-target"
                style={{ color: '#2E8A6A' }}
              >
                ← Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;