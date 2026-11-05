interface User {
  id: number;
  name: string;
  email: string;
  profile: Profile;
  role?: { name: string };
}

interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  createdAt: Date;
  onboardingCompleted: boolean;
}

export type { User, Profile };
