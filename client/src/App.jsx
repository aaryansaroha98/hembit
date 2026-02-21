import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Topbar } from './components/Topbar';
import { Footer } from './components/Footer';
import { AdminRoute, ProtectedRoute } from './components/Guards';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { ServicesPage } from './pages/ServicesPage';
import { OurStoryPage, FounderStoryPage, PrivacyPolicyPage, TermsPage } from './pages/ContentPages';
import { CheckoutPage } from './pages/CheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { CartPage } from './pages/CartPage';
import { HBProductionsPage } from './pages/HBProductionsPage';
import { AdminPage } from './pages/AdminPage';

function MainLayout({ children }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    document.body.classList.toggle('home-view', isHome);
    return () => document.body.classList.remove('home-view');
  }, [isHome]);

  return (
    <div className={`app-shell${isHome ? ' app-shell-home' : ''}`}>
      <Topbar />
      <main key={`${location.pathname}${location.search}`} className="page-transition">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout>
              <HomePage />
            </MainLayout>
          }
        />
        <Route
          path="/shop"
          element={
            <MainLayout>
              <ShopPage />
            </MainLayout>
          }
        />
        <Route
          path="/product/:slug"
          element={
            <MainLayout>
              <ProductDetailsPage />
            </MainLayout>
          }
        />
        <Route
          path="/signin"
          element={
            <MainLayout>
              <SignInPage />
            </MainLayout>
          }
        />
        <Route
          path="/signup"
          element={
            <MainLayout>
              <SignUpPage />
            </MainLayout>
          }
        />
        <Route
          path="/services"
          element={
            <MainLayout>
              <ServicesPage />
            </MainLayout>
          }
        />
        <Route
          path="/our-story"
          element={
            <MainLayout>
              <OurStoryPage />
            </MainLayout>
          }
        />
        <Route
          path="/founder-story"
          element={
            <MainLayout>
              <FounderStoryPage />
            </MainLayout>
          }
        />
        <Route
          path="/privacy-policy"
          element={
            <MainLayout>
              <PrivacyPolicyPage />
            </MainLayout>
          }
        />
        <Route
          path="/terms-of-use"
          element={
            <MainLayout>
              <TermsPage />
            </MainLayout>
          }
        />
        <Route
          path="/hb-productions"
          element={
            <MainLayout>
              <HBProductionsPage />
            </MainLayout>
          }
        />
        <Route
          path="/cart"
          element={
            <MainLayout>
              <CartPage />
            </MainLayout>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CheckoutPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AccountPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-tracking"
          element={
            <MainLayout>
              <OrderTrackingPage />
            </MainLayout>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
