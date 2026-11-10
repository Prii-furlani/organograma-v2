import React from 'react';
import LoginModal from './LoginModal';

/**
 * Adapter wrapper para o novo componente corporativo executivo LoginModal
 */
export default function LoginView({ isOpen, onClose, onLogin, onBackToPublic }) {
  return (
    <LoginModal
      isOpen={isOpen}
      isModal={true}
      onClose={onClose}
      onLogin={onLogin}
      onBackToPublic={onBackToPublic || onClose}
    />
  );
}
