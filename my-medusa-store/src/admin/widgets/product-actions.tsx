import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Button, toast } from "@medusajs/ui";
import { useState } from "react";

export default function ProductActionsWidget() {
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/admin/products/sync", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Product sync started! Check console for progress.");
      } else {
        toast.error("Failed to start product sync");
      }
    } catch (error) {
      console.error("Error syncing products:", error);
      toast.error("Failed to start product sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch("/admin/products/export");

      if (response.ok) {
        // Trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `products_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success("Products exported successfully");
      } else {
        toast.error("Failed to export products");
      }
    } catch (error) {
      console.error("Error exporting products:", error);
      toast.error("Failed to export products");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Container className="p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? "Syncing..." : "🔄 Sync Products (DummyJSON)"}
        </Button>
        <Button
          variant="secondary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? "Exporting..." : "📥 Export Products CSV"}
        </Button>
      </div>
      <div className="mt-2 text-xs text-gray-600">
        <p>• Sync imports products from DummyJSON API</p>
        <p>• Export downloads all products as CSV</p>
      </div>
    </Container>
  );
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
});
