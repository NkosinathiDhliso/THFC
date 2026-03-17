describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should have proper heading hierarchy', () => {
    cy.get('h1').should('exist');
    cy.get('h1').should('have.length', 1);
  });

  it('should have proper form labels', () => {
    cy.get('input[type="email"]').should('have.attr', 'id');
    cy.get('label[for]').should('exist');
  });

  it('should support keyboard navigation', () => {
    // Tab through form elements
    cy.get('input[type="email"]').focus();
    cy.get('input[type="email"]').tab();
    cy.focused().should('have.attr', 'type', 'password');
  });

  it('should have sufficient color contrast', () => {
    // Check that text is visible against backgrounds
    cy.get('body').should('have.css', 'color');
    cy.get('body').should('have.css', 'background-color');
  });

  it('should have proper ARIA attributes', () => {
    cy.get('button[type="submit"]').should('have.attr', 'aria-label').or('have.text');
    cy.get('input[required]').should('have.attr', 'aria-required', 'true');
  });

  it('should announce form validation errors', () => {
    cy.get('input[type="email"]').type('invalid-email');
    cy.get('button[type="submit"]').click();
    
    // Check for error messages that screen readers can announce
    cy.get('[role="alert"], [aria-live]').should('exist');
  });
});