import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Upload, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TransferRecord {
  id: string;
  type: "import" | "export";
  file_name: string | null;
  record_count: number;
  status: string;
  details: string | null;
  created_at: string;
}

export const logDataTransfer = async (
  userId: string,
  type: "import" | "export",
  recordCount: number,
  fileName?: string,
  details?: string
) => {
  try {
    await supabase.from("data_transfer_history" as any).insert({
      user_id: userId,
      type,
      file_name: fileName || null,
      record_count: recordCount,
      status: "success",
      details: details || null,
    } as any);
  } catch (e) {
    console.error("Failed to log transfer:", e);
  }
};

const DataTransferHistory = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase.from("data_transfer_history" as any) as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRecords(data as TransferRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchHistory();
  }, [isOpen, user]);

  const deleteRecord = async (id: string) => {
    await (supabase.from("data_transfer_history" as any) as any).delete().eq("id", id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Record deleted" });
  };

  const clearAll = async () => {
    if (!user) return;
    await (supabase.from("data_transfer_history" as any) as any).delete().eq("user_id", user.id);
    setRecords([]);
    toast({ title: "History cleared" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Transfer History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Upload & Download History</span>
            {records.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive">
                Clear All
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transfer history yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant={r.type === "import" ? "default" : "secondary"} className="flex items-center gap-1 w-fit">
                        {r.type === "import" ? <Upload className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                        {r.type === "import" ? "Import" : "Export"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{r.file_name || "—"}</div>
                      {r.details && <div className="text-xs text-muted-foreground">{r.details}</div>}
                    </TableCell>
                    <TableCell>{r.record_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.created_at), "dd MMM yyyy, hh:mm a")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteRecord(r.id)} className="h-7 w-7">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DataTransferHistory;
