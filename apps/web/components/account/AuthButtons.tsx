// src/components/account/AuthButtons.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function AuthButtons() {
  const { user, loading, logout } = useAuth();

  if (loading) return null;    // or a spinner

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-white">Hello, {user.email}</span>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <Link
        href="/account/signup"
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        Sign Up
      </Link>
      <Link
        href="/account/login"
        className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        Log In
      </Link>
    </div>
  );
}
