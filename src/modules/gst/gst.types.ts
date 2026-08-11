export interface GSTBusinessDetails {
  gstin: string;
  legalName: string | null;
  tradeName: string | null;
  registrationStatus: string | null;
  registrationDate: string | null;
  businessType: string | null;

  address: {
    building?: string;
    street?: string;
    locality?: string;
    city?: string;
    district?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
    country?: string;
  };

  source: string;
  fetchedAt: Date;
}

export interface GSTINValidationResult {
  valid: boolean;
  normalizedGSTIN?: string;
  error?: string;
}

export interface GSTProvider {
  getBusinessDetails(gstin: string): Promise<GSTBusinessDetails>;
}
