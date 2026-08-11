import { Job } from "bullmq";
import { prisma } from "../../utils/database";
import { logger } from "../../utils/logger";
import { lookupGSTBusiness } from "../gst/gst.service";
import { discoverBusiness } from "../discovery/discovery.service";
import { calculateBusinessMatchScore } from "../scoring/identity-score";
import { scoreContacts, ContactWithScore } from "../scoring/contact-score";
import { discoverWebsiteContacts } from "../crawler/crawler.service";

const IDENTITY_THRESHOLD = 0.7;

export async function processLookup(job: Job): Promise<any> {
  const { lookupId, gstin } = job.data as { lookupId: string; gstin: string };

  logger.info({ lookupId, gstin }, "Processing lookup");

  try {
    await prisma.lookup.update({
      where: { id: lookupId },
      data: { status: "processing" },
    });

    const { validation, details: gstDetails } = await lookupGSTBusiness(gstin);

    if (!gstDetails) {
      await prisma.lookup.update({
        where: { id: lookupId },
        data: {
          status: "completed",
          completedAt: new Date(),
          error: validation.error || "Invalid GSTIN",
          result: { error: "INVALID_GSTIN", message: validation.error },
        },
      });
      return { status: "invalid_gstin" };
    }

    let business = await prisma.business.findUnique({ where: { gstin } });

    if (!business) {
      business = await prisma.business.create({
        data: {
          gstin: gstDetails.gstin,
          legalName: gstDetails.legalName,
          tradeName: gstDetails.tradeName,
          registrationStatus: gstDetails.registrationStatus,
          registrationDate: gstDetails.registrationDate,
          businessType: gstDetails.businessType,
          building: gstDetails.address.building,
          street: gstDetails.address.street,
          locality: gstDetails.address.locality,
          city: gstDetails.address.city,
          district: gstDetails.address.district,
          state: gstDetails.address.state,
          stateCode: gstDetails.address.stateCode,
          pincode: gstDetails.address.pincode,
          country: gstDetails.address.country,
          source: gstDetails.source,
        },
      });
    }

    await prisma.lookup.update({
      where: { id: lookupId },
      data: { businessId: business.id },
    });

    const candidates = await discoverBusiness(
      gstDetails.legalName || "",
      gstDetails.tradeName,
      gstDetails.address.city || null,
      gstDetails.address.state || null,
      gstDetails.address.pincode || null
    );

    const matchedCandidates = candidates.filter((c) => {
      const score = calculateBusinessMatchScore(gstDetails, c);
      return score >= IDENTITY_THRESHOLD;
    });

    let website = matchedCandidates.find((c) => c.website)?.website || null;

    if (website) {
      try {
        await prisma.business.update({
          where: { id: business.id },
          data: { website },
        });
      } catch {
        // Ignore update failures
      }
    }

    let scoredContacts: ContactWithScore[] = scoreContacts(matchedCandidates);

    if (website) {
      try {
        const crawled = await discoverWebsiteContacts(website);
        if (crawled) {
          for (const phone of crawled.phones) {
            scoredContacts.push({
              type: "phone",
              value: phone,
              normalizedValue: phone,
              confidence: 0.95,
              source: "official_website",
              sourceUrl: crawled.website,
              sourceType: "official_website",
            });
          }
          for (const email of crawled.emails) {
            scoredContacts.push({
              type: "email",
              value: email,
              normalizedValue: email,
              confidence: 0.95,
              source: "official_website",
              sourceUrl: crawled.website,
              sourceType: "official_website",
            });
          }
        }
      } catch (error) {
        logger.warn({ lookupId, website, err: error }, "Website crawl failed");
      }
    }

    for (const contact of scoredContacts) {
      try {
        const existing = await prisma.contact.findFirst({
          where: {
            businessId: business.id,
            type: contact.type,
            normalizedValue: contact.normalizedValue,
          },
        });

        if (existing) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: { confidence: Math.max(existing.confidence, contact.confidence) },
          });
          await prisma.contactSource.create({
            data: {
              contactId: existing.id,
              sourceType: contact.sourceType,
              sourceUrl: contact.sourceUrl,
            },
          });
        } else {
          const created = await prisma.contact.create({
            data: {
              businessId: business.id,
              type: contact.type,
              value: contact.value,
              normalizedValue: contact.normalizedValue,
              confidence: contact.confidence,
            },
          });
          await prisma.contactSource.create({
            data: {
              contactId: created.id,
              sourceType: contact.sourceType,
              sourceUrl: contact.sourceUrl,
            },
          });
        }
      } catch (error) {
        logger.warn({ lookupId, contact, err: error }, "Failed to save contact");
      }
    }

    const phones = scoredContacts
      .filter((c) => c.type === "phone")
      .map((c) => ({
        number: c.normalizedValue,
        confidence: Math.round(c.confidence * 100) / 100,
        sources: [{ type: c.sourceType, url: c.sourceUrl || null }],
      }));

    const emails = scoredContacts
      .filter((c) => c.type === "email")
      .map((c) => ({
        email: c.normalizedValue,
        confidence: Math.round(c.confidence * 100) / 100,
        sources: [{ type: c.sourceType, url: c.sourceUrl || null }],
      }));

    const message =
      scoredContacts.filter((c) => c.type === "phone").length === 0
        ? "Business identified, but no publicly available phone number was found."
        : null;

    const result = {
      business: {
        gstin: gstDetails.gstin,
        legalName: gstDetails.legalName,
        tradeName: gstDetails.tradeName,
        city: gstDetails.address.city,
        state: gstDetails.address.state,
        pincode: gstDetails.address.pincode,
      },
      contacts: {
        phones,
        emails,
        website: website || undefined,
      },
      message,
    };

    await prisma.lookup.update({
      where: { id: lookupId },
      data: {
        status: "completed",
        completedAt: new Date(),
        result,
      },
    });

    logger.info({ lookupId, gstin, phoneCount: phones.length }, "Lookup completed");

    return result;
  } catch (error: any) {
    logger.error({ lookupId, gstin, err: error }, "Lookup failed");

    await prisma.lookup.update({
      where: { id: lookupId },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: error.message,
        result: { error: "PROCESSING_ERROR", message: error.message },
      },
    });

    throw error;
  }
}
