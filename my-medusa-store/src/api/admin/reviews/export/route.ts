import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import ReviewModuleService from "../../../../modules/review/service";

/**
 * Basic CSV stringifier
 */
function jsonToCsv(items: Record<string, any>[]): string {
  if (items.length === 0) {
    return "";
  }
  
  const headers = Object.keys(items[0]);
  const csvRows = [headers.join(",")];
  
  for (const item of items) {
    const values = headers.map(header => {
      const val = item[header];
      // Escape logic: wrap strings in quotes, escape existing quotes
      if (typeof val === "string") {
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return val ?? "";
    });
    csvRows.push(values.join(","));
  }
  
  return csvRows.join("\n");
}

/**
 * Export reviews as CSV
 * GET /admin/reviews/export
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const reviewService = req.scope.resolve("review") as ReviewModuleService;

  try {
    // Fetch all reviews (you might want to add pagination for very large datasets)
    const { reviews } = await reviewService.listReviewsWithCount({
      limit: 10000, // Adjust based on your needs
      offset: 0,
    });

    // Transform to flat structure for CSV
    const flatReviews = reviews.map(r => ({
      id: r.id,
      product_id: r.product_id,
      customer_name: r.customer_name,
      customer_email: r.customer_email || "",
      rating: r.rating,
      comment: r.comment || "",
      status: r.status,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : "",
      approved_at: r.approved_at ? new Date(r.approved_at).toISOString() : "",
      approved_by: r.approved_by || "",
      ip_address: r.ip_address || "",
    }));

    // Convert to CSV
    const csvContent = jsonToCsv(flatReviews);

    // Send Response
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition", 
      `attachment; filename="reviews_export_${Date.now()}.csv"`
    );
    
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting reviews:", error);
    res.status(500).json({ error: "Failed to export reviews" });
  }
}
