
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Leads() {
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leads Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Leads management functionality will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
