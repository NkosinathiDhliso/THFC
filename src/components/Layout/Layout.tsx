import React from 'react';
import Header from './Header';
import { User } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onSignOut: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onSignOut }) => {
  return (
    <div className="layout-container">
      <Header user={user} onSignOut={onSignOut} />
      <main className="main-content">
        <div className="content-wrapper">
          <div className="scrollable-content px-2 sm:px-4 md:px-6 py-2 sm:py-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;