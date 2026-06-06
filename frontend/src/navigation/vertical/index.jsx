import {
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  FileSignature,
  History,
  BarChart3
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
    name: 'RFQs',
    to: '/rfqs',
    icon: FileText,
    roles: ['admin', 'procurement_officer', 'manager', 'vendor']
  },
  {
    name: 'Approvals',
    to: '/approvals',
    icon: CheckSquare,
    roles: ['admin', 'manager']
  },
  {
    name: 'POs & Invoices',
    to: '/purchase-orders',
    icon: FileSignature,
    roles: ['admin', 'procurement_officer', 'manager', 'vendor']
  },
  {
    name: 'Activity Logs',
    to: '/activity',
    icon: History,
    roles: ['admin', 'procurement_officer', 'manager']
  },
  {
    name: 'Reports',
    to: '/reports',
    icon: BarChart3,
    roles: ['admin', 'procurement_officer', 'manager']
  }
];

export default navigation;
