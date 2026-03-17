import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseReady } from '../../lib/supabase';

interface SignUpFormProps {
  onSignUp: () => void;
  onError: (message: string) => void;
  onBackToLogin: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSignUp, onError, onBackToLogin }) => {
  // State management
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    employeeId: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      onError('Please fill in all required fields');
      return false;
    }

    if (formData.password.length < 6) {
      onError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      onError('Passwords do not match');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      onError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const employeeId = formData.employeeId || `FF-${Date.now().toString().slice(-3)}`;
      
      // Check if Supabase is configured
      if (!isSupabaseReady) {
        onError('Supabase is not configured. Please set up your environment variables.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            employee_id: employeeId,
          }
        }
      });

      if (error) {
        onError(error.message);
        return;
      }

      if (!data.user) {
        onError('Failed to create user account');
        return;
      }

      // Try to create profile record
      try {
        const profileInsertResult = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              full_name: formData.fullName,
              employee_id: employeeId,
              email: formData.email,
            }
          ])
          .select();

        if (profileInsertResult.error) {
          console.warn('Profile creation failed:', profileInsertResult.error);
          // Don't fail the sign up process for profile creation errors
        }
      } catch (profileCreateError) {
        console.warn('Profile creation exception:', profileCreateError);
        // Don't fail the sign up process for profile creation errors
      }

      setIsSubmitted(true);
      onSignUp();
    } catch (error) {
      console.error('Signup error:', error);
      onError('An unexpected error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-background-off-white)]">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-[var(--color-semantic-success)] rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail size={24} className="text-white" />
          </div>
          <h1 className="text-h2 mb-3">Check Your Email</h1>
          <p className="text-body-default mb-4">
            We've sent a verification link to <strong>{formData.email}</strong>. 
            Please check your email and click the verification link to activate your account.
          </p>
          <p className="text-caption mb-4">
            After verifying your email, you can return here and sign in with your credentials.
          </p>
          <button
            onClick={onBackToLogin}
            className="btn-primary w-full text-button"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-background-off-white)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-4">
          <button
            onClick={onBackToLogin}
            className="flex items-center gap-2 text-[var(--color-primary-brand)] hover:underline mb-3 mx-auto"
          >
            <ArrowLeft size={16} />
            <span className="text-caption">Back to Sign In</span>
          </button>
          
          <div className="w-12 h-12 bg-[var(--color-primary-brand)] rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">TH</span>
          </div>
          <h1 className="text-h2 mb-1">Create Account</h1>
          <p className="text-body-default mb-1">Join the Food Forward team</p>
          <p className="text-caption">Fill in your details to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="fullName" className="text-label block mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={18} />
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className="input-field w-full"
                placeholder="Enter your full name"
                required
                disabled={isLoading}
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="employeeId" className="text-label block mb-1">
              Employee ID
            </label>
            <div className="relative">
              <input
                type="text"
                id="employeeId"
                value={formData.employeeId}
                onChange={(e) => handleInputChange('employeeId', e.target.value)}
                className="input-field w-full"
                placeholder="Optional (e.g., FF-001)"
                disabled={isLoading}
                style={{ paddingLeft: '16px' }}
              />
            </div>
            <p className="text-caption mt-1">Leave blank to auto-generate</p>
          </div>

          <div>
            <label htmlFor="email" className="text-label block mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={18} />
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="input-field w-full"
                placeholder="Enter your email"
                required
                disabled={isLoading}
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-label block mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="input-field w-full"
                placeholder="Create a password"
                required
                disabled={isLoading}
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-caption mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-label block mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={18} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="input-field w-full"
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full text-button mt-4"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUpForm;
