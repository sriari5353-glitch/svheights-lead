
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DoubleConfirmDeleteProps {
  onDelete: () => void;
}

export default function DoubleConfirmDelete({ onDelete }: DoubleConfirmDeleteProps) {
  const handleDelete = () => {
    const firstConfirm = window.confirm("Are you sure you want to delete this?");
    if (!firstConfirm) return;

    const secondConfirm = window.confirm("⚠️ This action is permanent. Proceed?");
    if (!secondConfirm) return;

    onDelete(); // Actual delete function
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      className="text-red-600 hover:text-red-800"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
