
import React, { useState } from "react";
import { useCRM } from "@/context/CRMContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, Edit, Trash2, Calendar, MessageSquare } from "lucide-react";
import { LeadForm } from "./LeadForm";
import CalendarNotes from "./CalendarNotes";
import { Lead } from "@/types/crm";

const Leads = () => {
  const { leads, deleteLead, sendWhatsAppNow } = useCRM();
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLeadForNotes, setSelectedLeadForNotes] = useState<Lead | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New Lead": return "bg-blue-500";
      case "Prospect": return "bg-yellow-500";
      case "Hot Lead": return "bg-orange-500";
      case "Negotiation": return "bg-purple-500";
      case "Closed": return "bg-green-500";
      case "Lost": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const handleWhatsApp = (lead: Lead) => {
    sendWhatsAppNow([lead.id], "Hello! Following up on our conversation.");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Leads ({leads.length})</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add New Lead</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <LeadForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {leads.map((lead) => (
          <Card key={lead.id} className="w-full">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{lead.name}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(lead.status)} text-white`}>
                    {lead.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Source:</span> {lead.source}
                </div>
                <div>
                  <span className="font-medium">Feedback:</span> {lead.feedback || "None"}
                </div>
              </div>
              
              {lead.sourceDetails && (
                <div className="text-sm">
                  <span className="font-medium">Source Details:</span> {lead.sourceDetails}
                </div>
              )}
              
              {lead.notes && (
                <div className="text-sm">
                  <span className="font-medium">Notes:</span> {lead.notes}
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(lead.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLeadForNotes(lead)}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Notes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWhatsApp(lead)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingLead(lead)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteLead(lead.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Lead Dialog */}
      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <LeadForm 
              initialData={{
                name: editingLead.name,
                phone: editingLead.phone,
                source: editingLead.source,
                sourceDetails: editingLead.sourceDetails,
                status: editingLead.status,
                notes: editingLead.notes,
                feedback: editingLead.feedback,
              }}
              isEditing={true}
              leadId={editingLead.id}
              onSuccess={() => setEditingLead(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Calendar Notes Dialog */}
      <Dialog open={!!selectedLeadForNotes} onOpenChange={(open) => !open && setSelectedLeadForNotes(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Calendar Notes</DialogTitle>
          </DialogHeader>
          {selectedLeadForNotes && (
            <CalendarNotes 
              contactId={selectedLeadForNotes.id} 
              contactName={selectedLeadForNotes.name} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leads;
