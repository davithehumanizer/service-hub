type Repairer = {
  repairer_id: string;
  name: string;
  description: string;
  address: string;
  country: string;
  countryName?: string;
  postal_code: string;
  city: string;
  website: string;
  email: string;
  phone: string;
  latitude: number;
  longitude: number;
  repairerDevices: { device_type: string; repairer_device_id: string }[];
  source?: string;
  partner_type?: string;
};
type RepairerFilters = {
  id: string;
  category: string;
  name: string;
  label?: string;
  icon?: string;
  count?: number;
};

export type { Repairer, RepairerFilters };
