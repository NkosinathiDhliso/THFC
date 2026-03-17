import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignUpForm from '../../components/Auth/SignUpForm';
import { supabase } from '../../lib/supabase';

// Mock the supabase module
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(),
      })),
    })),
  },
}));

describe.skip('SignUpForm', () => {
  const mockOnSignUp = vi.fn();
  const mockOnError = vi.fn();
  const mockOnBackToLogin = vi.fn();

  const defaultProps = {
    onSignUp: mockOnSignUp,
    onError: mockOnError,
    onBackToLogin: mockOnBackToLogin,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders all form fields correctly', () => {
      render(<SignUpForm {...defaultProps} />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/employee id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to sign in/i })).toBeInTheDocument();
    });

    it('shows password visibility toggles', () => {
      render(<SignUpForm {...defaultProps} />);

      const passwordToggles = screen.getAllByRole('button');
      const eyeButtons = passwordToggles.filter(button => 
        button.getAttribute('type') === 'button' && 
        button.querySelector('svg')
      );
      
      expect(eyeButtons).toHaveLength(2); // One for password, one for confirm password
    });

    it('shows helper text for fields', () => {
      render(<SignUpForm {...defaultProps} />);

      expect(screen.getByText(/leave blank to auto-generate/i)).toBeInTheDocument();
      expect(screen.getByText(/minimum 6 characters/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it.skip('validates required fields', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      expect(mockOnError).toHaveBeenCalledWith('Please fill in all required fields');
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'invalid-email');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      expect(mockOnError).toHaveBeenCalledWith('Please enter a valid email address');
    });

    it('validates password length', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), '12345'); // Too short
      await user.type(screen.getByLabelText(/confirm password/i), '12345');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      expect(mockOnError).toHaveBeenCalledWith('Password must be at least 6 characters long');
    });

    it('validates password confirmation match', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'different123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      expect(mockOnError).toHaveBeenCalledWith('Passwords do not match');
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password/i);
      const passwordToggle = passwordInput.parentElement?.querySelector('button[type="button"]');

      expect(passwordInput).toHaveAttribute('type', 'password');

      if (passwordToggle) {
        await user.click(passwordToggle);
        expect(passwordInput).toHaveAttribute('type', 'text');

        await user.click(passwordToggle);
        expect(passwordInput).toHaveAttribute('type', 'password');
      }
    });

    it('toggles confirm password visibility', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const confirmPasswordToggle = confirmPasswordInput.parentElement?.querySelector('button[type="button"]');

      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      if (confirmPasswordToggle) {
        await user.click(confirmPasswordToggle);
        expect(confirmPasswordInput).toHaveAttribute('type', 'text');

        await user.click(confirmPasswordToggle);
        expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      }
    });
  });

  describe('Employee ID Auto-generation', () => {
    it('auto-generates employee ID when left blank', async () => {
      const user = userEvent.setup();
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      render(<SignUpForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      // Leave employee ID blank

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'password123',
          options: {
            data: {
              full_name: 'John Doe',
              employee_id: expect.stringMatching(/^FF-\d{3}$/), // Auto-generated format
            },
          },
        });
      });
    });

    it('uses provided employee ID when specified', async () => {
      const user = userEvent.setup();
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      render(<SignUpForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/employee id/i), 'FF-001');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'password123',
          options: {
            data: {
              full_name: 'John Doe',
              employee_id: 'FF-001',
            },
          },
        });
      });
    });
  });

  describe('Successful Signup Flow', () => {
    it('handles successful signup with profile creation', async () => {
      const user = userEvent.setup();
      const mockUser = { id: 'test-user-id', email: 'john@example.com' };
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      render(<SignUpForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
        expect(mockInsert).toHaveBeenCalledWith([{
          id: 'test-user-id',
          full_name: 'John Doe',
          employee_id: expect.any(String),
          email: 'john@example.com',
        }]);
      });

      // Should show email verification screen
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
        expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
      });
    });

    it('shows email verification screen after successful signup', async () => {
      const user = userEvent.setup();
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      render(<SignUpForm {...defaultProps} />);

      // Fill and submit form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Wait for email verification screen
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
        expect(screen.getByText(/verification link/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back to sign in/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles auth signup errors', async () => {
      const user = userEvent.setup();
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already registered' },
      });

      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);

      render(<SignUpForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Email already registered');
      });
    });

    it.skip('handles profile creation errors with cleanup', async () => {
      const user = userEvent.setup();
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });
      const mockSignOut = vi.fn().mockResolvedValue({ error: null });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Profile creation failed' }
        }),
      });

      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);
      vi.mocked(supabase.auth.signOut).mockImplementation(mockSignOut);
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      render(<SignUpForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled(); // Should clean up auth user
        expect(mockOnError).toHaveBeenCalledWith('Failed to create user profile. Please try again.');
      });
    });

    it.skip('handles missing user in signup response', async () => {
      const user = userEvent.setup();
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);

      render(<SignUpForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to create user account');
      });
    });
  });

  describe('Loading States', () => {
    it.skip('shows loading state during signup', async () => {
      const user = userEvent.setup();
      let resolveSignUp: (value: any) => void;
      const signUpPromise = new Promise(resolve => {
        resolveSignUp = resolve;
      });
      
      const mockSignUp = vi.fn().mockReturnValue(signUpPromise);
      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);

      render(<SignUpForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();

      // Resolve the promise
      resolveSignUp!({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });
    });

    it.skip('disables form inputs during loading', async () => {
      const user = userEvent.setup();
      let resolveSignUp: (value: any) => void;
      const signUpPromise = new Promise(resolve => {
        resolveSignUp = resolve;
      });
      
      const mockSignUp = vi.fn().mockReturnValue(signUpPromise);
      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);

      render(<SignUpForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Form inputs should be disabled
      expect(screen.getByLabelText(/full name/i)).toBeDisabled();
      expect(screen.getByLabelText(/email address/i)).toBeDisabled();
      expect(screen.getByLabelText(/^password/i)).toBeDisabled();
      expect(screen.getByLabelText(/confirm password/i)).toBeDisabled();

      // Resolve the promise
      resolveSignUp!({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });
    });
  });

  describe('Navigation', () => {
    it('calls onBackToLogin when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);

      const backButton = screen.getByRole('button', { name: /back to sign in/i });
      await user.click(backButton);

      expect(mockOnBackToLogin).toHaveBeenCalled();
    });

    it.skip('calls onBackToLogin from email verification screen', async () => {
      const user = userEvent.setup();
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      render(<SignUpForm {...defaultProps} />);

      // Complete signup flow
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Wait for email verification screen
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      // Click back button from verification screen
      const backButton = screen.getByRole('button', { name: /back to sign in/i });
      await user.click(backButton);

      expect(mockOnBackToLogin).toHaveBeenCalled();
    });
  });
}); 