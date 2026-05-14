/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';
import LandingPage from './views/LandingPage';
import Projects from './views/Projects';
import Contact from './views/Contact';
import ShotlistEditor from './views/ShotlistEditor';
import Auth from './views/Auth';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Toaster } from 'sonner';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin" />
    </div>
  );
  
  if (!user) return <Navigate to="/auth" />;
  
  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="w-full h-full"
        >
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/projects" element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            } />
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <ShotlistEditor />
              </ProtectedRoute>
            } />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <Router>
        <AppContent />
      </Router>
      <Analytics />
    </AuthProvider>
  );
}
