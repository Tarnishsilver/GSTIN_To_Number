import { GSTProvider, GSTBusinessDetails } from "../gst.types";

const MOCK_BUSINESSES: Record<string, GSTBusinessDetails> = {
  "27ABCDE1234F1Z0": {
    gstin: "27ABCDE1234F1Z0",
    legalName: "ABC Technologies Private Limited",
    tradeName: "ABC Tech",
    registrationStatus: "Active",
    registrationDate: "2019-06-15",
    businessType: "Private Limited Company",
    address: {
      building: "Tech Park, B Wing",
      street: "Andheri Kurla Road",
      locality: "Andheri East",
      city: "Mumbai",
      district: "Mumbai Suburban",
      state: "Maharashtra",
      stateCode: "27",
      pincode: "400093",
      country: "India",
    },
    source: "mock",
    fetchedAt: new Date(),
  },
  "24ABCDE1234F1Z6": {
    gstin: "24ABCDE1234F1Z6",
    legalName: "Gujarat Industrial Solutions Limited",
    tradeName: "GIS Industries",
    registrationStatus: "Active",
    registrationDate: "2020-01-10",
    businessType: "Public Limited Company",
    address: {
      building: "Industrial Estate, Plot 42",
      street: "GIDC Vatva",
      locality: "Vatva",
      city: "Ahmedabad",
      district: "Ahmedabad",
      state: "Gujarat",
      stateCode: "24",
      pincode: "382445",
      country: "India",
    },
    source: "mock",
    fetchedAt: new Date(),
  },
  "29ABCDE1234F1ZW": {
    gstin: "29ABCDE1234F1ZW",
    legalName: "Bangalore Software Innovations Pvt Ltd",
    tradeName: "BSI Software",
    registrationStatus: "Active",
    registrationDate: "2018-03-22",
    businessType: "Private Limited Company",
    address: {
      building: "Innovation Hub, 3rd Floor",
      street: "Outer Ring Road",
      locality: "Marathahalli",
      city: "Bangalore",
      district: "Bangalore Urban",
      state: "Karnataka",
      stateCode: "29",
      pincode: "560037",
      country: "India",
    },
    source: "mock",
    fetchedAt: new Date(),
  },
  "07ABCDE1234F1Z2": {
    gstin: "07ABCDE1234F1Z2",
    legalName: "Delhi Trading Co",
    tradeName: "Delhi Trading Co.",
    registrationStatus: "Active",
    registrationDate: "2020-11-05",
    businessType: "Partnership",
    address: {
      building: "Shop No 15, Nehru Market",
      street: "Chandni Chowk Road",
      locality: "Chandni Chowk",
      city: "Delhi",
      district: "Central Delhi",
      state: "Delhi",
      stateCode: "07",
      pincode: "110006",
      country: "India",
    },
    source: "mock",
    fetchedAt: new Date(),
  },
  "24ABOCS0383E2ZB": {
    gstin: "24ABOCS0383E2ZB",
    legalName: "SCANINFOGA SOLUTIONS PRIVATE LIMITED",
    tradeName: "SCANINFOGA SOLUTIONS PRIVATE LIMITED",
    registrationStatus: "Active",
    registrationDate: "2025-07-02",
    businessType: "Private Limited Company",
    address: {
      building: "HIGHFIELD ASCOT, Shop No 128, 129",
      street: "VIP Road",
      locality: "Surat",
      city: "Surat",
      district: "Surat",
      state: "Gujarat",
      stateCode: "24",
      pincode: "395007",
      country: "India",
    },
    source: "mock",
    fetchedAt: new Date(),
  },
};

export class MockGSTProvider implements GSTProvider {
  async getBusinessDetails(gstin: string): Promise<GSTBusinessDetails> {
    const business = MOCK_BUSINESSES[gstin];

    if (!business) {
      throw Object.assign(
        new Error(`Business not found for GSTIN: ${gstin}`),
        { code: "BUSINESS_NOT_FOUND", status: 404, isNotRetryable: true }
      );
    }

    return {
      ...business,
      fetchedAt: new Date(),
    };
  }
}
