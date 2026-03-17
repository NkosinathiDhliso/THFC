import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from '../../components/Auth/LoginForm';

// Mock the supabase module
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

describe('LoginForm', () => {
  const mockOnLogin = vi.fn();
  const mockOnError = vi.fn();
  const mockOnShowSignUp = vi.fn();

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form elements', async () => {
    await act(async () => {
      renderWithRouter(
        <LoginForm
          onLogin={mockOnLogin}
          onError={mockOnError}
          onShowSignUp={mockOnShowSignUp}
        />
      );
    });

    expect(screen.getByText('THFCScan')).toBeInTheDocument();
    expect(screen.getByText('Food Forward Portal')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('handles form submission with valid credentials', async () => {
    const user = userEvent.setup();
    const { supabase } = await import('../../lib/supabase');
    
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null,
    });

    await act(async () => {
      renderWithRouter(
        <LoginForm
          onLogin={mockOnLogin}
          onError={mockOnError}
          onShowSignUp={mockOnShowSignUp}
        />
      );
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
    });

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  it('handles authentication errors', async () => {
    const user = userEvent.setup();
    const { supabase } = await import('../../lib/supabase');
    
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    await act(async () => {
      renderWithRouter(
        <LoginForm
          onLogin={mockOnLogin}
          onError={mockOnError}
          onShowSignUp={mockOnShowSignUp}
        />
      );
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByPlaceholderText(/enter your password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
    });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        'Invalid email or password. Please check your credentials and try again.'
      );
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      renderWithRouter(
        <LoginForm
          onLogin={mockOnLogin}
          onError={mockOnError}
          onShowSignUp={mockOnShowSignUp}
        />
      );
    });

    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });

    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await act(async () => {
      await user.click(toggleButton);
    });
    
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await act(async () => {
      await user.click(toggleButton);
    });
    
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('navigates to sign up form', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      renderWithRouter(
        <LoginForm
          onLogin={mockOnLogin}
          onError={mockOnError}
          onShowSignUp={mockOnShowSignUp}
        />
      );
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sign up/i }));
    });
    
    expect(mockOnShowSignUp).toHaveBeenCalled();
  });

  it('disables form during submission', async () => {
    const user = userEvent.setup();
    const { supabase } = await import('../../lib/supabase');
    
    // Mock a slow response
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    await act(async () => {
      renderWithRouter(
        <LoginForm
          onLogin={mockOnLogin}
          onError={mockOnError}
          onShowSignUp={mockOnShowSignUp}
        />
      );
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
    });
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await act(async () => {
      await user.click(submitButton);
    });

    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });
});