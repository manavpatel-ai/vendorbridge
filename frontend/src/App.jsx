import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import RFQs from './pages/RFQs';
import RFQCreate from './pages/RFQCreate';
import RFQDetails from './pages/RFQDetails';
import QuotationSubmit from './pages/QuotationSubmit';
import QuotationComparison from './pages/QuotationComparison';
import Approval from './pages/Approval';
import PurchaseOrderInvoice from './pages/PurchaseOrderInvoice';
import Activity from './pages/Activity';
import Reports from './pages/Reports';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Screens */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Secure ERP System Shell Layout */}
          <Route path="/" element={<Layout />}>
            {/* Dashboard summary page */}
            <Route index element={<Dashboard />} />

            {/* Vendor Management */}
            <Route path="vendors" element={<Vendors />} />

            {/* Procurement RFQ Routes */}
            <Route path="rfqs" element={<RFQs />} />
            <Route path="rfqs/create" element={<RFQCreate />} />
            <Route path="rfqs/:id" element={<RFQDetails />} />
            <Route path="rfqs/:id/compare" element={<QuotationComparison />} />

            {/* Quotations submission page */}
            <Route path="quotations/submit" element={<QuotationSubmit />} />

            {/* Manager approval timeline queue */}
            <Route path="approvals" element={<Approval />} />

            {/* Financial tracking */}
            <Route path="purchase-orders" element={<PurchaseOrderInvoice />} />

            {/* Audit log trail */}
            <Route path="activity" element={<Activity />} />

            {/* Visual reports & export */}
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Fallback route - Redirect any unmatched to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
