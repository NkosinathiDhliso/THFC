import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonationForm from '../../components/Donation/DonationForm';
import type { User } from '../../types';

// Mock the camera component
vi.mock('../../components/Camera/CameraCapture', () => ({
  default: ({ onCapture, onClose }: { onCapture: (photo: string) => void; onClose: () => void }) => (
    <div data-testid="camera-capture">
      <button onClick={() => onCapture('mock-photo-url')}>Capture</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock the StoreSearch component
vi.mock('../../components/UI/StoreSearch', () => ({
  default: ({ value, onChange, disabled }: { value: string; onChange: (id: string, name: string) => void; disabled?: boolean }) => (
    <div data-testid="store-search">
      <input
        data-testid="store-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value, `Store ${e.target.value}`)}
        disabled={disabled}
        placeholder="Search Boxer & Pick n Pay stores..."
      />
      <button
        data-testid="select-rondebosch"
        onClick={() => onChange('pnp-rondebosch', 'Pick n Pay Rondebosch')}
      >
        Pick n Pay Rondebosch
      </button>
      <button
        data-testid="select-claremont"
        onClick={() => onChange('pnp-claremont', 'Pick n Pay Claremont')}
      >
        Pick n Pay Claremont
      </button>
    </div>
  ),
}));

// Mock the confirmation modal
vi.mock('../../components/Donation/ConfirmationModal', () => ({
  default: ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
    <div data-testid="confirmation-modal">
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('DonationForm', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
  };

  const mockOnSubmit = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders donation form elements', async () => {
    await act(async () => {
      render(
        <DonationForm
          user={mockUser}
          onSubmit={mockOnSubmit}
          onError={mockOnError}
          isSubmitting={false}
        />
      );
    });

    expect(screen.getByText('New Donation Report')).toBeInTheDocument();
    expect(screen.getByText('Store Location')).toBeInTheDocument();
    expect(screen.getByText('Bread Quantities')).toBeInTheDocument();
    expect(screen.getByText('White Bread (loaves)')).toBeInTheDocument();
    expect(screen.getByText('Brown Bread (loaves)')).toBeInTheDocument();
    expect(screen.getByText('Proof of Donation')).toBeInTheDocument();
    expect(screen.getByText('Certify & Submit Report')).toBeInTheDocument();
  });

  it('handles store selection', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <DonationForm
          user={mockUser}
          onSubmit={mockOnSubmit}
          onError={mockOnError}
          isSubmitting={false}
        />
      );
    });

    const rondeboschButton = screen.getByTestId('select-rondebosch');
    
    await act(async () => {
      await user.click(rondeboschButton);
    });

    // Verify store was selected by checking the search input value
    const storeInput = screen.getByTestId('store-search-input');
    expect(storeInput).toHaveValue('rondebosch');
  });

  it('handles quantity input changes', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <DonationForm
          user={mockUser}
          onSubmit={mockOnSubmit}
          onError={mockOnError}
          isSubmitting={false}
        />
      );
    });

    const whiteBreadInput = screen.getAllByRole('spinbutton')[0];
    
    await act(async () => {
      await user.clear(whiteBreadInput);
      await user.type(whiteBreadInput, '5');
    });

    expect(whiteBreadInput).toHaveValue(5);
  });

  it('handles quantity button clicks', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <DonationForm
          user={mockUser}
          onSubmit={mockOnSubmit}
          onError={mockOnError}
          isSubmitting={false}
        />
      );
    });

    // Find increment buttons by their SVG content
    const buttons = screen.getAllByRole('button');
    const incrementButtons = buttons.filter(button => {
      const svg = button.querySelector('svg');
      if (!svg) return false;
      const paths = svg.querySelectorAll('path');
      return Array.from(paths).some(path => 
        path.getAttribute('d')?.includes('M5 12h14') && 
        Array.from(paths).some(p => p.getAttribute('d')?.includes('M12 5v14'))
      );
    });

    expect(incrementButtons.length).toBeGreaterThan(0);
    
    // Click the first increment button (white bread)
    await act(async () => {
      await user.click(incrementButtons[0]);
    });
    
    const whiteBreadInput = screen.getAllByRole('spinbutton')[0];
    expect(whiteBreadInput).toHaveValue(1);
  });

  it('handles photo capture', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <DonationForm
          user={mockUser}
          onSubmit={mockOnSubmit}
          onError={mockOnError}
          isSubmitting={false}
        />
      );
    });

    const photoButton = screen.getByText('Take Photo of Donation');
    
    await act(async () => {
      await user.click(photoButton);
    });

    // Camera component should be shown
    expect(screen.getByTestId('camera-capture')).toBeInTheDocument();

    const captureButton = screen.getByText('Capture');
    
    await act(async () => {
      await user.click(captureButton);
    });

    // Should return to form with retake button
    await waitFor(() => {
      expect(screen.getByText('Retake')).toBeInTheDocument();
    });
  });

  it('validates form before submission', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <DonationForm
          user={mockUser}
          onSubmit={mockOnSubmit}
          onError={mockOnError}
          isSubmitting={false}
        />
      );
    });

    const submitButton = screen.getByText(/certify & submit report/i);
    
    // Submit button should be disabled initially
    expect(submitButton).toBeDisabled();
    
    await act(async () => {
      await user.click(submitButton);
    });

    // Form should not submit without required fields
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('enables submit button when form is valid', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <DonationForm
          user={mockUser}
          onSubmit={mockOnSubmit}
          onError={mockOnError}
          isSubmitting={false}
        />
      );
    });

    // Select store
    const rondeboschButton = screen.getByTestId('select-rondebosch');
    await act(async () => {
      await user.click(rondeboschButton);
    });

    // Set quantities
    const whiteBreadInput = screen.getAllByRole('spinbutton')[0];
    await act(async () => {
      await user.clear(whiteBreadInput);
      await user.type(whiteBreadInput, '5');
    });

    // Take photo
    const photoButton = screen.getByText('Take Photo of Donation');
    await act(async () => {
      await user.click(photoButton);
    });

    const captureButton = screen.getByText('Capture');
    await act(async () => {
      await user.click(captureButton);
    });

    // Now submit button should be enabled
    await waitFor(() => {
      const submitButton = screen.getByText(/certify & submit report/i);
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('shows confirmation modal before final submission', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <DonationForm
          user={mockUser}
          onSubmit={mockOnSubmit}
          onError={mockOnError}
          isSubmitting={false}
        />
      );
    });

    // Complete form
    const rondeboschButton = screen.getByTestId('select-rondebosch');
    await act(async () => {
      await user.click(rondeboschButton);
    });

    const whiteBreadInput = screen.getAllByRole('spinbutton')[0];
    await act(async () => {
      await user.clear(whiteBreadInput);
      await user.type(whiteBreadInput, '5');
    });

    const photoButton = screen.getByText('Take Photo of Donation');
    await act(async () => {
      await user.click(photoButton);
    });

    const captureButton = screen.getByText('Capture');
    await act(async () => {
      await user.click(captureButton);
    });

    // Submit form
    await waitFor(() => {
      const submitButton = screen.getByText(/certify & submit report/i);
      expect(submitButton).not.toBeDisabled();
    });

    const submitButton = screen.getByText(/certify & submit report/i);
    await act(async () => {
      await user.click(submitButton);
    });

    // Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    });

    // Confirm submission
    const confirmButton = screen.getByText('Confirm');
    await act(async () => {
      await user.click(confirmButton);
    });

    // onSubmit should be called
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('disables form during submission', async () => {
    await act(async () => {
      render(
        <DonationForm
          user={mockUser}
          onSubmit={mockOnSubmit}
          onError={mockOnError}
          isSubmitting={true}
        />
      );
    });

    const submitButton = screen.getByText(/submitting\.\.\./i);
    expect(submitButton).toBeDisabled();

    const storeInput = screen.getByTestId('store-search-input');
    expect(storeInput).toBeDisabled();
  });
});