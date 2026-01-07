import { Container, Heading, Button, Table, Badge, Select, toast } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { defineRouteConfig } from "@medusajs/admin-sdk";

type Review = {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email?: string;
  rating: number;
  comment?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at?: string;
  approved_by?: string;
};

type ReviewsResponse = {
  reviews: Review[];
  count: number;
  limit: number;
  offset: number;
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      
      if (status !== "all") {
        params.append("status", status);
      }

      const response = await fetch(`/admin/reviews?${params}`);
      const data: ReviewsResponse = await response.json();
      
      setReviews(data.reviews);
      setCount(data.count);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [status, offset]);

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

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) {
      return;
    }

    try {
      const response = await fetch(`/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        toast.success("Review deleted");
        fetchReviews();
      } else {
        toast.error("Failed to delete review");
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
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

  const handleExport = async () => {
    try {
      const response = await fetch("/admin/reviews/export");

      if (response.ok) {
        // Trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reviews_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success("Reviews exported successfully");
      } else {
        toast.error("Failed to export reviews");
      }
    } catch (error) {
      console.error("Error exporting reviews:", error);
      toast.error("Failed to export reviews");
    }
  };

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <Heading level="h1">Product Reviews</Heading>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleExport}
          >
            📥 Export CSV
          </Button>
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger>
              <Select.Value placeholder="Filter by status" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Reviews</Select.Item>
              <Select.Item value="pending">Pending</Select.Item>
              <Select.Item value="approved">Approved</Select.Item>
              <Select.Item value="rejected">Rejected</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading reviews...</div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">No reviews found</div>
        </div>
      ) : (
        <>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product ID</Table.HeaderCell>
                <Table.HeaderCell>Customer</Table.HeaderCell>
                <Table.HeaderCell>Rating</Table.HeaderCell>
                <Table.HeaderCell>Comment</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Date</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {reviews.map((review) => (
                <Table.Row key={review.id}>
                  <Table.Cell>
                    <code className="text-xs">{review.product_id.slice(0, 8)}...</code>
                  </Table.Cell>
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
                    <div className="max-w-md truncate text-sm">
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
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="transparent"
                            onClick={() => handleReject(review.id)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="small"
                        variant="transparent"
                        onClick={() => handleDelete(review.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Showing {offset + 1} to {Math.min(offset + limit, count)} of {count} reviews
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={offset + limit >= count}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </Container>
  );
}

export const config = defineRouteConfig({
  label: "Reviews",
  icon: () => "⭐", // You can replace with proper icon component
});
