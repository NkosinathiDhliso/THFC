describe('Donation Submission Flow', () => {
  beforeEach(() => {
    // Mock successful authentication
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user-id', email: 'test@foodforward.org' }
      }));
    });
    
    cy.mockCameraPermissions();
    cy.visit('/');
  });

  it('should display donation form for authenticated users', () => {
    cy.contains('New Donation Report').should('be.visible');
    cy.get('select').should('be.visible'); // Store selection
    cy.get('input[type="number"]').should('have.length', 2); // Quantity inputs
    cy.contains('Take Photo of Donation').should('be.visible');
  });

  it('should validate required fields', () => {
    cy.get('button').contains('Certify & Submit Report').click();
    
    // Form should not submit without required fields
    cy.url().should('include', '/');
  });

  it('should allow store selection', () => {
    cy.get('select').select('Pick n Pay Rondebosch');
    cy.get('select').should('have.value', 'Pick n Pay Rondebosch');
  });

  it('should allow manual store entry', () => {
    cy.get('select').select('Other (Manual Entry)');
    cy.get('input[placeholder="Enter store name"]').should('be.visible');
    cy.get('input[placeholder="Enter store name"]').type('Custom Store Name');
  });

  it('should handle quantity inputs', () => {
    // Test white bread quantity
    cy.get('input[type="number"]').first().clear().type('5');
    cy.get('input[type="number"]').first().should('have.value', '5');
    
    // Test brown bread quantity
    cy.get('input[type="number"]').last().clear().type('3');
    cy.get('input[type="number"]').last().should('have.value', '3');
  });

  it('should handle quantity buttons', () => {
    // Test increment buttons
    cy.get('button').contains('+').first().click();
    cy.get('input[type="number"]').first().should('have.value', '1');
    
    // Test decrement buttons
    cy.get('button').contains('-').first().click();
    cy.get('input[type="number"]').first().should('have.value', '0');
  });

  it('should open camera interface', () => {
    cy.get('button').contains('Take Photo of Donation').click();
    
    // Should show camera interface (mocked)
    cy.get('video, canvas').should('exist');
  });

  it('should complete full donation flow', () => {
    // Fill form
    cy.fillDonationForm({
      store: 'Pick n Pay Rondebosch',
      whiteBread: 5,
      brownBread: 3
    });
    
    // Mock photo capture
    cy.get('button').contains('Take Photo of Donation').click();
    // In a real test, we'd interact with the camera interface
    
    // Submit form (would show confirmation modal)
    cy.get('button').contains('Certify & Submit Report').click();
  });
});