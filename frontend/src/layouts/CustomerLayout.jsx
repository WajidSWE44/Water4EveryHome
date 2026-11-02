// frontend/src/layouts/CustomerLayout.jsx
import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export default function CustomerLayout() {
  const { user } = useAuth();

  return (
    <div className="d-flex flex-column min-vh-100">
      {user && !user.is_phone_verified && (
        <div className="bg-warning text-dark py-1 px-3 small text-center d-flex align-items-center justify-content-center gap-2 border-bottom">
          <AlertCircle size={15} />
          <span>Your mobile number is pending OTP verification.</span>
          <Link to="/verify-otp" className="fw-bold text-dark text-decoration-underline">Verify Now (Demo Mode)</Link>
        </div>
      )}

      <Navbar />

      <main className="flex-grow-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
