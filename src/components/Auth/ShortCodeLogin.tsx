import React, { useState, useRef, useEffect } from 'react';
import { Hash, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  short_code: string | null;
  short_code_created_at: string | null;
  short_code_last_used: string | null;
  is_active: boolean | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  short_code: string;
}

interface ShortCodeLoginProps {
  onLogin: (user: User) => void;
  onError: (message: string) => void;
  onShowFullLogin: () => void;
}

const ShortCodeLogin: React.FC<ShortCodeLoginProps> = ({ onLogin, onError, onShowFullLogin }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewCodeOption, setShowNewCodeOption] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits and uppercase letters
    const sanitizedValue = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    
    if (sanitizedValue.length <= 1) {
      const newCode = [...code];
      newCode[index] = sanitizedValue;
      setCode(newCode);

      // Auto-focus next input
      if (sanitizedValue && index < 5 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all fields are filled
      if (newCode.every(digit => digit !== '') && sanitizedValue) {
        handleSubmit(newCode.join(''));
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleSubmit = async (codeToSubmit?: string) => {
    const fullCode = codeToSubmit || code.join('');
    
    if (fullCode.length !== 6) {
      onError('Please enter a complete 6-character code');
      return;
    }

    setIsLoading(true);

    try {
      // Look up user by short code
      const { data: userProfile, error: lookupError } = await supabase
        .from('profiles')
        .select('*')
        .eq('short_code', fullCode)
        .single() as { data: UserProfile | null; error: unknown };

      if (lookupError || !userProfile) {
        setShowNewCodeOption(true);
        onError('Invalid code. Please check your code and try again.');
        return;
      }

      // Check if code is still active (not expired)
      const codeAge = userProfile.short_code_created_at 
        ? new Date().getTime() - new Date(userProfile.short_code_created_at).getTime()
        : 0;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      if (codeAge > maxAge) {
        setShowNewCodeOption(true);
        onError('Your code has expired. Please generate a new code.');
        return;
      }

      // For short code authentication, we need to create a session that persists
      // Since we don't have password-based auth, we'll store the user data in localStorage
      // and let the app handle session management differently for short code users
      
      const userData: User = {
        id: userProfile.id,
        email: userProfile.email || '',
        name: userProfile.full_name || 'Unknown',
        role: userProfile.role || 'user',
        short_code: userProfile.short_code || ''
      };

      // Store short code session in localStorage for persistence
      localStorage.setItem('thfcscan_shortcode_session', JSON.stringify({
        user: userData,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }));

      // Update last used timestamp
      await supabase
        .from('profiles')
        .update({ short_code_last_used: new Date().toISOString() })
        .eq('short_code', fullCode);

      onLogin(userData);

    } catch {
      onError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewCode = async () => {
    setIsGenerating(true);

    try {
      // This would typically be done through an admin interface
      // For now, we'll show instructions to contact admin
      onError(`New code generation requires admin approval. Please contact your administrator with request for new code.`);
      
    } catch {
      onError('Failed to generate new code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleNewCodeOption = () => {
    setShowNewCodeOption(!showNewCodeOption);
  };

  const clearCode = () => {
    setCode(['', '', '', '', '', '']);
    setShowNewCodeOption(false);
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-background-off-white)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--color-primary-brand)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="text-white" size={28} />
          </div>
          <h1 className="text-h1 mb-2">Quick Access</h1>
          <p className="text-body-default mb-1">Enter your 6-character code</p>
          <p className="text-caption text-[var(--color-text-secondary-medium-gray)]">
            Use the short code provided by your administrator
          </p>
        </div>

        <div className="space-y-6">
          {/* Code Input */}
          <div>
            <div className="flex justify-center gap-2 mb-4">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-bold border-2 border-[var(--color-border-light-gray)] rounded-lg focus:border-[var(--color-primary-brand)] focus:outline-none transition-colors"
                  maxLength={1}
                  disabled={isLoading}
                  inputMode="text"
                  autoComplete="off"
                />
              ))}
            </div>
            
            {showNewCodeOption && (
              <div className="text-center space-y-3">
                <button
                  onClick={clearCode}
                  className="text-sm text-[var(--color-primary-brand)] hover:underline"
                >
                  Try Different Code
                </button>
                <div className="text-sm text-[var(--color-text-secondary-medium-gray)]">
                  or
                </div>
                <button
                  onClick={generateNewCode}
                  disabled={isGenerating}
                  className="btn-secondary text-sm"
                >
                  <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                  {isGenerating ? 'Requesting...' : 'Request New Code'}
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleSubmit()}
            disabled={isLoading || code.some(digit => !digit)}
            className="btn-primary w-full text-button"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Alternative Login */}
          <div className="text-center">
            <button
              onClick={onShowFullLogin}
              className="text-caption text-[var(--color-primary-brand)] hover:underline"
            >
              Use Email & Password Instead
            </button>
          </div>

          {/* Toggle New Code Option */}
          <div className="text-center">
            <button
              onClick={toggleNewCodeOption}
              className="text-caption text-[var(--color-primary-brand)] hover:underline"
            >
              {showNewCodeOption ? 'Hide New Code Option' : 'Show New Code Option'}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-[var(--color-surface-white)] rounded-lg border border-[var(--color-border-light-gray)]">
          <h3 className="text-label mb-2">Need Help?</h3>
          <ul className="text-caption text-[var(--color-text-secondary-medium-gray)] space-y-1">
            <li>• Short codes are provided by your administrator</li>
            <li>• Codes expire after 7 days for security</li>
            <li>• Contact support if you need a new code</li>
            <li>• <strong>Alternatively, you can email support@thehealthfoodcompany.co.za to request a temporary login code. This code will be valid for 7 days.</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ShortCodeLogin;
