import {
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  CheckSquare,
  FileSignature,
  Receipt,
  BarChart3,
  History
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
    roles: ['admin', 'procurement_officer', 'manager']
  },
  {
    name: 'Vendors',
    to: '/vendors',
    icon: Users,
    roles: ['admin', 'procurement_officer']
  },
  {
    name: "RFQ's",
    to: '/rfqs',
    icon: FileText,
    roles: ['admin', 'procurement_officer', 'manager', 'vendor']
  },
  {
    name: 'Quotations',
    to: '/quotations',
    icon: TrendingUp,
    roles: ['admin', 'procurement_officer', 'manager', 'vendor']
  },
  {
    name: 'Approvals',
    to: '/approvals',
    icon: CheckSquare,
    roles: ['admin', 'manager', 'procurement_officer']
  },
  {
    name: 'Purchase orders',
    to: '/purchase-orders',
    icon: FileSignature,
    roles: ['admin', 'procurement_officer', 'manager', 'vendor']
  },
  {
    name: 'Invoices',
    to: '/invoices',
    icon: Receipt,
    roles: ['admin', 'procurement_officer', 'manager', 'vendor']
  },
  {
    name: 'Reports',
    to: '/reports',
    icon: BarChart3,
    roles: ['admin', 'procurement_officer', 'manager']
  },
  {
    name: 'Activity',
    to: '/activity',
    icon: History,
    roles: ['admin', 'procurement_officer', 'manager']
  }
];

export default navigation;
