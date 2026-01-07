import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { AdminProduct } from "@medusajs/framework/types";
import { 
  Container, 
  Heading, 
  Button, 
  Table, 
  Badge, 
  Input, 
  Textarea, 
  Label,
  toast 
} from "@medusajs/ui";
import { useEffect, useState } from "react";

type Review = {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email?: string;
  rating: number;
  comment?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type ReviewsData = {
  reviews: Review[];
  count: number;
  average_rating: number;
  total_ratings: number;
  rating_breakdown: Record<number, number>;
};

type Props = {
  data: AdminProduct;
};

export default function ProductReviewsWidget({ data }: Props) {
  const productId = data.id;
  
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    rating: 5,
    comment: "",
  });

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/admin/products/${productId}/reviews?limit=50`);
      const data: ReviewsData = await response.json();
      setReviewsData(data);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_name || formData.rating < 1 || formData.rating > 5) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/admin/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Review added successfully");
        setFormData({
          customer_name: "",
          customer_email: "",
          rating: 5,
          comment: "",
        });
        setShowAddForm(false);
        fetchReviews();
      } else {
        toast.error("Failed to add review");
      }
    } catch (error) {
      console.error("Error adding review:", error);
      toast.error("Failed to add review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      const response = await fetch(`/admin/reviews/${reviewId}/approve`, {
        method: "POST",
      });
      
      if (response.ok) {
        toast.success("Review approved");
        fetchReviews();
      } else {
        toast.error("Failed to approve review");
      }
    } catch (error) {
      console.error("Error approving review:", error);
      toast.error("Failed to approve review");
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      const response = await fetch(`/admin/reviews/${reviewId}/reject`, {
        method: "POST",
      });
      
      if (response.ok) {
        toast.success("Review rejected");
        fetchReviews();
      } else {
        toast.error("Failed to reject review");
      }
    } catch (error) {
      console.error("Error rejecting review:", error);
      toast.error("Failed to reject review");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "orange",
      approved: "green",
      rejected: "red",
    } as const;

    return (
      <Badge color={colors[status as keyof typeof colors] || "grey"}>
        {status}
      </Badge>
    );
  };

  const getRatingStars = (rating: number) => {
    return "⭐".repeat(rating);
  };

  const getRatingBreakdown = () => {
    if (!reviewsData?.rating_breakdown) return null;
    
    return (
      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = reviewsData.rating_breakdown[star] || 0;
          const percentage = reviewsData.total_ratings > 0 
            ? (count / reviewsData.total_ratings) * 100 
            : 0;
          
          return (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-12">{star} ⭐</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-12 text-right text-gray-600">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Container className="p-6">
        <div className="text-gray-500">Loading reviews...</div>
      </Container>
    );
  }

  return (
    <Container className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Heading level="h2">Product Reviews</Heading>
          <Button
            variant="secondary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "Cancel" : "➕ Add Review"}
          </Button>
        </div>

        {/* Average Rating Summary */}
        <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-4xl font-bold text-gray-900">
              {reviewsData?.average_rating?.toFixed(1) || "0.0"}
            </div>
            <div className="text-2xl mt-1">
              {getRatingStars(Math.round(reviewsData?.average_rating || 0))}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Based on {reviewsData?.total_ratings || 0} approved reviews
            </div>
          </div>
          <div>
            {getRatingBreakdown()}
          </div>
        </div>

        {/* Add Review Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
            <Heading level="h3">Add New Review</Heading>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  required
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <Label htmlFor="customer_email">Customer Email</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="rating">Rating *</Label>
              <select
                id="rating"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                <option value={4}>⭐⭐⭐⭐ (4)</option>
                <option value={3}>⭐⭐⭐ (3)</option>
                <option value={2}>⭐⭐ (2)</option>
                <option value={1}>⭐ (1)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Share your thoughts about this product..."
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add Review"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Heading level="h3">
              All Reviews ({reviewsData?.count || 0})
            </Heading>
          </div>

          {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Customer</Table.HeaderCell>
                  <Table.HeaderCell>Rating</Table.HeaderCell>
                  <Table.HeaderCell>Comment</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Date</Table.HeaderCell>
                  <Table.HeaderCell>Actions</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {reviewsData.reviews.map((review) => (
                  <Table.Row key={review.id}>
                    <Table.Cell>
                      <div>
                        <div className="font-medium">{review.customer_name}</div>
                        {review.customer_email && (
                          <div className="text-xs text-gray-500">{review.customer_email}</div>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-1">
                        <span>{getRatingStars(review.rating)}</span>
                        <span className="text-sm text-gray-600">({review.rating})</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="max-w-md text-sm">
                        {review.comment || <span className="text-gray-400">No comment</span>}
                      </div>
                    </Table.Cell>
                    <Table.Cell>{getStatusBadge(review.status)}</Table.Cell>
                    <Table.Cell>
                      <div className="text-sm">
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-2">
                        {review.status === "pending" && (
                          <>
                            <Button
                              size="small"
                              variant="transparent"
                              onClick={() => handleApprove(review.id)}
                            >
                              ✓
                            </Button>
                            <Button
                              size="small"
                              variant="transparent"
                              onClick={() => handleReject(review.id)}
                            >
                              ✗
                            </Button>
                          </>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No reviews yet. Be the first to add one!
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
});
