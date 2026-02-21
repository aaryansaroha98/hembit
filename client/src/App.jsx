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
    let animationFrame = null;
    let wheelResetTimer = null;
    let wheelAccumulator = 0;
    let isAnimating = false;
    let touchStartY = null;
    let touchStartX = null;
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slideDurationMs = prefersReducedMotion ? 0 : 860;
    const wheelThreshold = 60;
    const touchThreshold = 52;

    const getSections = () => Array.from(document.querySelectorAll('.hero-page, .site-footer--home'));

    const getCurrentIndex = (sections) => {
      if (!sections.length) {
        return -1;
      }

      const probeY = window.scrollY + window.innerHeight * 0.45;
      let currentIndex = 0;

      for (let index = 0; index < sections.length; index += 1) {
        if (sections[index].offsetTop <= probeY) {
          currentIndex = index;
        }
      }

      return currentIndex;
    };

    const shouldIgnoreTarget = (target) =>
      target?.closest?.('.mobile-panel, .mega-menu, input, textarea, select, [contenteditable="true"]');
    const isOverlayMenuOpen = () => Boolean(document.querySelector('.mobile-panel, .mega-menu'));

    const stopAnimation = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      isAnimating = false;
    };

    const animateScrollTo = (targetTop) =>
      new Promise((resolve) => {
        const startTop = window.scrollY;
        const distance = targetTop - startTop;

        if (Math.abs(distance) < 2) {
          resolve();
          return;
        }

        if (slideDurationMs === 0) {
          window.scrollTo(0, targetTop);
          resolve();
          return;
        }

        const startTime = performance.now();
        const easeInOutCubic = (value) =>
          value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

        const tick = (now) => {
          const progress = Math.min((now - startTime) / slideDurationMs, 1);
          const easedProgress = easeInOutCubic(progress);
          window.scrollTo(0, startTop + distance * easedProgress);

          if (progress < 1) {
            animationFrame = window.requestAnimationFrame(tick);
            return;
          }

          animationFrame = null;
          resolve();
        };

        animationFrame = window.requestAnimationFrame(tick);
      });

    const goToIndex = async (index) => {
      const sections = getSections();
      if (!sections.length || isAnimating) {
        return;
      }

      const targetIndex = Math.max(0, Math.min(index, sections.length - 1));
      const targetTop = sections[targetIndex].offsetTop;

      if (Math.abs(window.scrollY - targetTop) < 2) {
        return;
      }

      isAnimating = true;
      wheelAccumulator = 0;
      if (wheelResetTimer) {
        window.clearTimeout(wheelResetTimer);
        wheelResetTimer = null;
      }
      await animateScrollTo(targetTop);
      isAnimating = false;
    };

    const stepSlides = (direction) => {
      if (isAnimating) {
        return;
      }

      const sections = getSections();
      if (!sections.length) {
        return;
      }

      const currentIndex = getCurrentIndex(sections);
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0 || nextIndex >= sections.length) {
        return;
      }

      goToIndex(nextIndex);
    };

    const onWheel = (event) => {
      if (!isHome || isOverlayMenuOpen() || shouldIgnoreTarget(event.target)) {
        return;
      }

      if (Math.abs(event.deltaY) < 4) {
        return;
      }

      event.preventDefault();

      wheelAccumulator += event.deltaY;
      if (wheelResetTimer) {
        window.clearTimeout(wheelResetTimer);
      }
      wheelResetTimer = window.setTimeout(() => {
        wheelAccumulator = 0;
      }, 130);

      if (Math.abs(wheelAccumulator) < wheelThreshold) {
        return;
      }

      const direction = wheelAccumulator > 0 ? 1 : -1;
      wheelAccumulator = 0;
      stepSlides(direction);
    };

    const onKeyDown = (event) => {
      if (!isHome || isOverlayMenuOpen()) {
        return;
      }

      const targetTag = event.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'select' || targetTag === 'textarea' || event.target?.isContentEditable) {
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        stepSlides(1);
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        stepSlides(-1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        goToIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        const sections = getSections();
        if (sections.length) {
          goToIndex(sections.length - 1);
        }
      }
    };

    const onTouchStart = (event) => {
      if (!isHome || isOverlayMenuOpen() || shouldIgnoreTarget(event.target) || event.touches.length !== 1) {
        return;
      }

      touchStartY = event.touches[0].clientY;
      touchStartX = event.touches[0].clientX;
    };

    const onTouchMove = (event) => {
      if (!isHome || isOverlayMenuOpen() || touchStartY === null || touchStartX === null || shouldIgnoreTarget(event.target)) {
        return;
      }

      const currentTouch = event.touches[0];
      const deltaY = touchStartY - currentTouch.clientY;
      const deltaX = touchStartX - currentTouch.clientX;

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        event.preventDefault();
      }
    };

    const onTouchEnd = (event) => {
      if (
        !isHome ||
        isOverlayMenuOpen() ||
        touchStartY === null ||
        touchStartX === null ||
        shouldIgnoreTarget(event.target)
      ) {
        touchStartY = null;
        touchStartX = null;
        return;
      }

      const touch = event.changedTouches[0];
      const deltaY = touchStartY - touch.clientY;
      const deltaX = touchStartX - touch.clientX;

      touchStartY = null;
      touchStartX = null;

      if (Math.abs(deltaY) < touchThreshold || Math.abs(deltaY) < Math.abs(deltaX)) {
        return;
      }

      stepSlides(deltaY > 0 ? 1 : -1);
    };

    document.body.classList.toggle('home-view', isHome);
    if (isHome) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
    }

    return () => {
      document.body.classList.remove('home-view');

      if (wheelResetTimer) {
        window.clearTimeout(wheelResetTimer);
      }

      stopAnimation();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
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
