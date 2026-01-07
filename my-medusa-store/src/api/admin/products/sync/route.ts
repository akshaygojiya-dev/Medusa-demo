import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import syncProductsJob from "../../../../jobs/sync-products";

/**
 * Manual trigger for product sync
 * POST /admin/products/sync
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const container = req.scope;
  const logger = container.resolve("logger");

  try {
    logger.info("[Admin] Manual product sync triggered");
    
    // Run sync job asynchronously
    syncProductsJob(container)
      .then(() => logger.info("[Admin] Manual sync completed"))
      .catch((err) => logger.error("[Admin] Manual sync failed:", err));

    res.json({ 
      message: "Product sync started in background",
      status: "processing" 
    });
  } catch (error) {
    logger.error("[Admin] Error starting sync:", error);
    res.status(500).json({ error: "Failed to start product sync" });
  }
}
