import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import ReviewModuleService from "../../../../../modules/review/service";

/**
 * Get all reviews and average rating for a specific product
 * GET /admin/products/:product_id/reviews
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const reviewService = req.scope.resolve("review") as ReviewModuleService;
  const { product_id } = req.params;
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    // Get reviews
    const filters: any = {
      product_id,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    };

    if (status && status !== "all") {
      filters.status = status;
    }

    const reviewsData = await reviewService.listReviewsWithCount(filters);

    // Get average rating (only approved reviews)
    const ratingData = await reviewService.getAverageRating(product_id);

    res.json({
      reviews: reviewsData.reviews,
      count: reviewsData.count,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      average_rating: ratingData.average,
      total_ratings: ratingData.total,
      rating_breakdown: ratingData.breakdown,
    });
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    res.status(500).json({ error: "Failed to fetch product reviews" });
  }
}

/**
 * Add a new review to a product (Admin can add on behalf of customers)
 * POST /admin/products/:product_id/reviews
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const reviewService = req.scope.resolve("review") as ReviewModuleService;
  const { product_id } = req.params;
  const { rating, comment, customer_name, customer_email } = req.body as any;

  // Validation
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  if (!customer_name || customer_name.length < 2) {
    return res.status(400).json({ error: "Customer name is required and must be at least 2 characters" });
  }

  try {
    const review = await reviewService.createReview({
      product_id,
      customer_name,
      customer_email,
      rating,
      comment,
      ip_address: "admin", // Mark as admin-created
    });

    res.status(201).json({ review });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
}
