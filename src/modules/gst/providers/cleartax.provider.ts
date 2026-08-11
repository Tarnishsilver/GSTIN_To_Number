import { GSTProvider, GSTBusinessDetails } from "../gst.types";
import { env } from "../../../config/env";
import { logger } from "../../../utils/logger";

interface ClearTaxResponse {
  taxpayerInfo: {
    gstin: string;
    lgnm: string;
    tradeNam: string;
    sts: string;
    rgdt: string;
    ctb: string;
    dty: string;
    nba: string[];
    stj: string;
    ctj: string;
    stjCd: string;
    ctjCd: string;
    cxdt: string;
    lstupdt: string;
    errorMsg: string | null;
    pradr: {
      addr: {
        bnm: string;
        st: string;
        loc: string;
        bno: string;
        stcd: string;
        flno: string;
        dst: string;
        city: string;
        pncd: string;
      };
      ntr: string;
    };
  };
}

export class ClearTaxGSTProvider implements GSTProvider {
  async getBusinessDetails(gstin: string): Promise<GSTBusinessDetails> {
    const url = `${env.CLEARTAX_BASE_URL}/f/compliance-report/${gstin}/`;

    logger.info({ gstin, url }, "Fetching GST data from ClearTax");

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 422) {
        throw Object.assign(
          new Error(`Business not found for GSTIN: ${gstin}`),
          { code: "BUSINESS_NOT_FOUND", status: 404, isNotRetryable: true }
        );
      }
      throw Object.assign(
        new Error(`ClearTax API returned ${response.status}`),
        { code: "GST_PROVIDER_UNAVAILABLE", status: 502, isNotRetryable: false }
      );
    }

    const data = (await response.json()) as ClearTaxResponse;

    if (!data.taxpayerInfo || data.taxpayerInfo.errorMsg) {
      throw Object.assign(
        new Error(data.taxpayerInfo?.errorMsg || `Business not found for GSTIN: ${gstin}`),
        { code: "BUSINESS_NOT_FOUND", status: 404, isNotRetryable: true }
      );
    }

    const info = data.taxpayerInfo;
    const addr = info.pradr?.addr || {};

    const addressParts = [
      addr.flno,
      addr.bnm,
      addr.bno,
    ].filter(Boolean);

    const city = addr.city || addr.loc || addr.dst || "";

    return {
      gstin: info.gstin,
      legalName: info.lgnm || null,
      tradeName: info.tradeNam !== info.lgnm ? info.tradeNam : null,
      registrationStatus: info.sts || null,
      registrationDate: info.rgdt || null,
      businessType: info.ctb || null,
      address: {
        building: addressParts.join(", ") || undefined,
        street: addr.st || undefined,
        locality: addr.loc || undefined,
        city: city || undefined,
        district: addr.dst || undefined,
        state: addr.stcd || undefined,
        stateCode: info.stjCd?.substring(0, 2) || undefined,
        pincode: addr.pncd || undefined,
        country: "India",
      },
      source: "cleartax",
      fetchedAt: new Date(),
    };
  }
}
