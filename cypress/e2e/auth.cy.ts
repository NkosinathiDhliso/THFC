describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display login form when not authenticated', () => {
    cy.contains('THFCScan').should('be.visible');
    cy.contains('Food Forward Portal').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('contain', 'Sign In');
  });

  it('should show validation errors for invalid login', () => {
    cy.get('input[type="email"]').type('invalid@email.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    
    // Should show error message (mocked response)
    cy.contains('Invalid email or password').should('be.visible');
  });

  it('should navigate to sign up form', () => {
    cy.contains('Sign Up').click();
    cy.contains('Create Account').should('be.visible');
    cy.get('input[placeholder="Enter your full name"]').should('be.visible');
  });

  it('should validate sign up form fields', () => {
    cy.contains('Sign Up').click();
    
    // Try to submit empty form
    cy.get('button[type="submit"]').click();
    
    // Should show validation (HTML5 validation will prevent submission)
    cy.get('input[required]:invalid').should('have.length.greaterThan', 0);
  });

  it('should show password visibility toggle', () => {
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[aria-label*="password"], button[title*="password"]').click();
    cy.get('input[type="text"]').should('be.visible');
  });
});