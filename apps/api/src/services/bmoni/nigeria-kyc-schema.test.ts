import { describe, expect, it } from "vitest";

import { updateNigeriaKycInputSchema } from "./schemas.js";

describe("Nigeria NGN KYC contract", () => {
  it("accepts the documented NGN local profile shape", () => {
    const result = updateNigeriaKycInputSchema.safeParse({
      personalInfo: {
        firstName: "Bunch",
        lastName: "Dillon",
        phoneNumber: "+2348000000000",
        dateOfBirth: "1990-01-15",
        gender: "male"
      },
      address: {
        streetLine1: "15 Admiralty Way",
        city: "Lagos",
        state: "Lagos",
        postalCode: "101241",
        countryCode: "NGA"
      },
      identificationNumbers: [
        {
          type: "bvn",
          number: "95888168924",
          issuingCountryCode: "NGA"
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects the old addressDetails shape", () => {
    const result = updateNigeriaKycInputSchema.safeParse({
      personalInfo: {
        firstName: "Bunch",
        lastName: "Dillon",
        phoneNumber: "+2348000000000",
        dateOfBirth: "1990-01-15"
      },
      addressDetails: {
        street: "15 Admiralty Way",
        city: "Lagos",
        state: "Lagos",
        countryCode: "NGA"
      }
    });

    expect(result.success).toBe(false);
  });

  it("requires a six-digit Nigerian postal code", () => {
    const result = updateNigeriaKycInputSchema.safeParse({
      personalInfo: {
        firstName: "Bunch",
        lastName: "Dillon",
        phoneNumber: "+2348000000000",
        dateOfBirth: "1990-01-15"
      },
      address: {
        streetLine1: "15 Admiralty Way",
        city: "Lagos",
        state: "Lagos",
        postalCode: "10124",
        countryCode: "NGA"
      },
      identificationNumbers: [
        {
          type: "bvn",
          number: "95888168924",
          issuingCountryCode: "NGA"
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
