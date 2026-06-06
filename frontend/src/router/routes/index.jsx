import { lazy } from 'react';

// Lazy load views for better performance
const Login = lazy(() => import('../../views/Authentication/Login'));
const Register = lazy(() => import('../../views/Authentication/Register'));
const Dashboard = lazy(() => import('../../views/Dashboard'));
const Vendors = lazy(() => import('../../views/Vendors'));
const RFQs = lazy(() => import('../../views/RFQ/RFQs'));
const RFQCreate = lazy(() => import('../../views/RFQ/RFQCreate'));
const RFQDetails = lazy(() => import('../../views/RFQ/RFQDetails'));
const QuotationSubmit = lazy(() => import('../../views/Quotation/QuotationSubmit'));
const QuotationComparison = lazy(() => import('../../views/Quotation/QuotationComparison'));
const Quotations = lazy(() => import('../../views/Quotation'));
const Approval = lazy(() => import('../../views/Approval'));
const PurchaseOrderInvoice = lazy(() => import('../../views/PurchaseOrder'));
const Invoices = lazy(() => import('../../views/Invoice'));
const InvoiceDetails = lazy(() => import('../../views/Invoice/InvoiceDetails'));
const Activity = lazy(() => import('../../views/Activity'));
const Reports = lazy(() => import('../../views/Reports'));

export const RoutesList = [
  // Public Routes
  {
    path: '/login',
    element: <Login />,
    meta: {
      publicRoute: true
    }
  },
  {
    path: '/register',
    element: <Register />,
    meta: {
      publicRoute: true
    }
  },
  
  // Protected Dashboard Routes
  {
    path: '/',
    element: <Dashboard />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/vendors',
    element: <Vendors />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/rfqs',
    element: <RFQs />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/rfqs/create',
    element: <RFQCreate />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/rfqs/:id',
    element: <RFQDetails />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/rfqs/:id/compare',
    element: <QuotationComparison />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/quotations/submit',
    element: <QuotationSubmit />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/quotations',
    element: <Quotations />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/approvals',
    element: <Approval />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/purchase-orders',
    element: <PurchaseOrderInvoice />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/invoices',
    element: <Invoices />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/invoices/:id',
    element: <InvoiceDetails />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/activity',
    element: <Activity />,
    meta: {
      publicRoute: false
    }
  },
  {
    path: '/reports',
    element: <Reports />,
    meta: {
      publicRoute: false
    }
  }
];
