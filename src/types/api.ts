export interface BackendAdmin {
  id: string;
  name: string;
  email: string;
  active: boolean;
  city: string | null;
  pincode: string | null;
  state: string | null;
  adminApproval?: {
    requireSuperAdminApproval: boolean;
  };
  permissions?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface BackendProduct {
  id: number | string;
  name: string;
  price: number;
  stock: number;
}

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

export interface CreateAdminPayload {
  name: string;
  email: string;
  password: string;
  city: string;
  pincode: string;
  state: string;
  permissions?: string[];
}

export interface UpdateAdminPayload {
  name?: string;
  email?: string;
  city?: string | null;
  pincode?: string | null;
  state?: string | null;
  active?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  demo?: boolean;
  message?: string;
}
