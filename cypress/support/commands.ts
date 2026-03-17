/// <reference types="cypress" />

// Custom commands for THFCScan testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mock camera permissions for testing
       */
      mockCameraPermissions(): Chainable<void>;
      
      /**
       * Fill donation form with test data
       */
      fillDonationForm(data: {
        store: string;
        whiteBread: number;
        brownBread: number;
      }): Chainable<void>;
      
      /**
       * Login with test credentials
       */
      loginWithTestUser(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('mockCameraPermissions', () => {
  cy.window().then((win) => {
    // Mock getUserMedia
    cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves({
      getTracks: () => [{ stop: cy.stub() }],
      getVideoTracks: () => [{ stop: cy.stub() }],
    });
  });
});

Cypress.Commands.add('fillDonationForm', (data) => {
  cy.get('select').select(data.store);
  cy.get('input[type="number"]').first().clear().type(data.whiteBread.toString());
  cy.get('input[type="number"]').last().clear().type(data.brownBread.toString());
});

Cypress.Commands.add('loginWithTestUser', () => {
  cy.window().then((win) => {
    win.localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: 'mock-token',
      user: { id: 'test-user-id', email: 'test@foodforward.org' }
    }));
  });
});

export {};