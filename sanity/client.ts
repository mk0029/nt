import { createClient } from "@sanity/client";

const config = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2026-09-01",
  // Read-through of documents written moments ago (sessions, lock state,
  // recovery codes) must be consistent, so never serve from the CDN cache.
  useCdn: false,
};

export const sanityClientRead = createClient(config);

export const sanityClientWrite = process.env.SANITY_API_TOKEN
  ? createClient({ ...config, token: process.env.SANITY_API_TOKEN, useCdn: false })
  : null;