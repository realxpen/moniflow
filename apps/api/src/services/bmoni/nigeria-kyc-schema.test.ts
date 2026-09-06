import { describe, expect, it } from "vitest";

import { updateNigeriaKycInputSchema } from "./schemas.js";

const currentNigeriaProfile = {
  personalInfo: {
    firstName: "Chiamaka",
    lastName: "Okafor",
    phoneNumber: "+2348012345678",
    dateOfBirth: "1990-01-01",
    gender: "female"
  },
  address: {
    streetLine1: "15 Admiralty Way",
    city: "Lagos",
    state: "Lagos",
    postalCode: "101241",
    countryCode: "NGA" as const
  },
  employment: {
    occupationCode: "15-1252",
    employerName: "ACME Corp",
    employmentStatus: "employed"
  },
  sourceOfFunds: "salary",
  estimatedMonthlyVolume: 4999,
  accountPurpose: "personal",
  actingAsIntermediary: false,
  identificationNumbers: [
    {
      type: "bvn" as const,
      number: "22222222222",
      issuingCountryCode: "NGA" as const
    }
  ]
};

describe("Nigeria NGN KYC contract", () => {
  it("accepts the current BMONI NGN profile shape", () => {
    const result = updateNigeriaKycInputSchema.safeParse(currentNigeriaProfile);
    expect(result.success).toBe(true);
  });

  it("rejects the older minimal profile that omitted employment and compliance fields", () => {
    const result = updateNigeriaKycInputSchema.safeParse({
      personalInfo: currentNigeriaProfile.personalInfo,
      address: currentNigeriaProfile.address,
      identificationNumbers: currentNigeriaProfile.identificationNumbers
    });
    expect(result.success).toBe(false);
  });

  it("requires a provider occupation code rather than inventing one", () => {
    const result = updateNigeriaKycInputSchema.safeParse({
      ...currentNigeriaProfile,
      employment: {
        ...currentNigeriaProfile.employment,
        occupationCode: ""
      }
    });
    expect(result.success).toBe(false);
  });

  it("requires an 11-digit BVN", () => {
    const result = updateNigeriaKycInputSchema.safeParse({
      ...currentNigeriaProfile,
      identificationNumbers: [
        {
          type: "bvn",
          number: "2222222222",
          issuingCountryCode: "NGA"
        }
      ]
    });
    expect(result.success).toBe(false);
  });
});
