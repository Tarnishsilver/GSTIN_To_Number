export interface BusinessCandidate {
  name: string;
  website?: string;
  phoneNumbers: string[];
  emails: string[];
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  source: string;
  sourceUrl?: string;
  rawText?: string;
}

export interface BusinessSearchQuery {
  companyName: string;
  tradeName?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface BusinessDiscoveryProvider {
  search(query: BusinessSearchQuery): Promise<BusinessCandidate[]>;
}
