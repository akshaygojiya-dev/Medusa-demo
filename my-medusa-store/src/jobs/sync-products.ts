import { MedusaContainer } from "@medusajs/framework/types";
import { batchProductsWorkflow, DummyProduct } from "../workflows/sync-batch";

// ---------------------------------------------------------
// TYPES & CONFIG
// ---------------------------------------------------------

interface DummyResponse {
  products: DummyProduct[];
  total: number;
  skip: number;
  limit: number;
}

const API_URL = "https://dummyjson.com/products";
const BATCH_SIZE = 20; // Requirement: 10-20
const MAX_RETRIES = 3;

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Robust fetch with exponential backoff
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (err) {
      lastError = err as Error;
      // console.warn(`[Sync] Attempt ${attempt} failed: ${lastError.message}`);
      if (attempt < retries) {
        const backoff = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        await delay(backoff);
      }
    }
  }
  throw lastError || new Error("Unknown network error");
}

/**
 * Fetch a single page of products
 */
async function fetchProductsPage(limit: number, skip: number): Promise<DummyResponse> {
  const url = `${API_URL}?limit=${limit}&skip=${skip}`;
  const response = await fetchWithRetry(url);
  return (await response.json()) as DummyResponse;
}

// ---------------------------------------------------------
// JOB
// ---------------------------------------------------------

export default async function syncProductsJob(root: any) {
  const container = root.container || root;
  const logger = container.resolve("logger");
  
  logger.info("🚀 [Sync] Starting daily product sync job...");
  
  try {
    let skip = 0;
    let totalSynced = 0;
    let hasMore = true;
    
    // Safety break
    const SAFE_MAX = 5000;

    while (hasMore && skip < SAFE_MAX) {
      // 1. Fetch
      logger.info(`[Sync] Fetching batch (Limit: ${BATCH_SIZE}, Skip: ${skip})...`);
      const data = await fetchProductsPage(BATCH_SIZE, skip);
      
      const batch = data.products;
      if (!batch || batch.length === 0) {
        hasMore = false;
        break;
      }

      // 2. Process Batch via Workflow
      logger.info(`[Sync] Processing batch of ${batch.length} products...`);
      
      try {
        const { result, errors } = await batchProductsWorkflow(container)
          .run({
            input: { products: batch },
            throwOnError: false // Handle gracefully
          });
          
        if (errors && errors.length > 0) {
          logger.error(`[Sync] Batch failed with ${errors.length} errors.`);
          errors.forEach(e => logger.error(JSON.stringify(e)));
          // Logic: Continue to next batch? Yes, don't block entire sync for one batch failure.
        } else {
          // logger.info(`[Sync] Batch success. Synced IDs: ${result.length}`);
          totalSynced += batch.length;
        }
        
      } catch (workflowErr) {
        logger.error(`[Sync] Critical Workflow Error: ${(workflowErr as Error).message}`);
      }

      // 3. Pagination
      skip += BATCH_SIZE;
      if (skip >= data.total) {
        hasMore = false;
      }
    }

    logger.info(`✅ [Sync] Job completed. Total synced: ${totalSynced}`);

  } catch (err) {
    logger.error(`❌ [Sync] Job Crashed: ${(err as Error).message}`);
  }
}

export const config = {
  name: "sync-products",
  schedule: "0 0 * * *", // Daily at midnight === for 30 seconds => "*/30 * * * * *"
};
