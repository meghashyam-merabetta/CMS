export type TrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';

export interface MetricValue {
  value: number;
  percentageChange: number;
  trend: TrendDirection;
  comparison: string;
}

export interface DashboardSummary {
  totalUsers: { value: number };
  totalProducts: { value: number };
  totalCancelProducts: { value: number };
  totalReturnProducts: { value: number };
  totalEarning: { value: number };
  totalEvent: { value: number };
  totalReplacement: { value: number };
  totalInquiry: { value: number };
}

export interface MonthlyDataPoint {
  month: string;
  monthIndex: number; // 1-12
  users: number;
  products: number;
  orders: number;
  cancelledOrders: number;
}

export interface UsersAndProductsData {
  totalUsers: MetricValue;
  totalProducts: MetricValue;
  monthlyData: MonthlyDataPoint[];
}

export interface OrdersAndCancelledData {
  totalOrders: MetricValue;
  cancelledOrders: MetricValue;
  monthlyData: MonthlyDataPoint[];
}

export interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: string;
  activeRoutes: string[];
  children?: NavItem[];
}

export interface DateRange {
  fromDate: string;
  toDate: string;
}

export interface AdminRecord {
  id: string;
  adminCode: string;
  name: string;
  email: string;
  permissionCount: number;
  roles: string[];
  statusCode: 'ACTIVE' | 'BLOCKED';
  createdAt: string;
}

export interface CustomerUserRecord {
  id: string;
  customerCode: string;
  displayName: string;
  email: string;
  mobile: string;
  city: string;
  createdAt: string;
  statusCode: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  totalOrders: number;
}

export interface ProductRecord {
  id: string;
  productCode: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  statusCode: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  image?: string;
  createdAt: string;
}

export interface CategoryRecord {
  id: string;
  categoryCode: string;
  name: string;
  slug: string;
  subcategoriesCount: number;
  productsCount: number;
  statusCode: 'ACTIVE' | 'INACTIVE';
  image?: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  itemsCount: number;
  totalAmount: number;
  paymentMethod: 'COD' | 'PREPAID' | 'UPI';
  orderDate: string;
  orderStatus: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
}

export interface LabRecord {
  id: string;
  labCode: string;
  name: string;
  city: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  accreditation: string;
  statusCode: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface TestCategoryRecord {
  id: string;
  categoryCode: string;
  name: string;
  slug: string;
  icon: string;       // Lucide icon name, e.g. 'Heart'
  iconBg: string;     // Tailwind/hex bg colour
  iconColor: string;  // Tailwind/hex icon colour
  testsCount: number;
  packagesCount: number;
  statusCode: 'ACTIVE' | 'INACTIVE';
}

export interface LabTestRecord {
  id: string;
  testCode: string;
  name: string;
  categoryId: string;
  categoryName: string;
  reportTimeHrs: number;
  originalPrice: number;   // Lab's cost / base price
  marginalPrice: number;   // Our selling price (original + margin)
  description: string;
  statusCode: 'ACTIVE' | 'INACTIVE';
}

export interface LabPackageRecord {
  id: string;
  packageCode: string;
  name: string;
  categoryId: string;
  categoryName: string;
  reportTimeHrs: number;
  testsIncluded: number;
  originalPrice: number;   // Lab's cost / base price
  marginalPrice: number;   // Our selling price (original + margin)
  description: string;
  statusCode: 'ACTIVE' | 'INACTIVE';
}
