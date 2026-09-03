# BMONI service boundary

This directory contains the server-only BMONI Embedded integration. `client.ts` is the only provider HTTP boundary, `schemas.ts` validates documented payloads, and `user-service.ts` coordinates durable identity mapping without automatic mutation retries.

The hackathon client is sandbox-only. Do not import it into mobile code, add undocumented endpoints, log credentials/provider bodies, or extend it to wallet, KYC, signing, or money movement without a separately scoped phase and current official documentation.
