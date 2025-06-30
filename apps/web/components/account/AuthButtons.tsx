'use client'

import Link from 'next/link'

export default function AuthButtons() {
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
  )
}
