import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RoutesList } from './routes';
import VerticalLayout from '../layouts/VerticalLayout';
import ThemeLoader from '../layouts/components/ThemeLoader';

const Router = () => {
  // Separate routes into public and protected
  const publicRoutes = RoutesList.filter(r => r.meta?.publicRoute);
  const protectedRoutes = RoutesList.filter(r => !r.meta?.publicRoute);

  return (
    <Suspense
      fallback={
        <ThemeLoader />
      }
    >
      <Routes>
        {/* Public Routes */}
        {publicRoutes.map(route => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}

        {/* Protected Routes inside layout */}
        <Route element={<VerticalLayout />}>
          {protectedRoutes.map(route => {
            if (route.path === '/') {
              return <Route key="index" index element={route.element} />;
            }
            // Strip leading slash for nested routes under "/" Layout
            const nestedPath = route.path.replace(/^\//, '');
            return <Route key={route.path} path={nestedPath} element={route.element} />;
          })}
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default Router;
