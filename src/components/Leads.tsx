
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LeadForm } from '@/components/LeadForm';
import { useCRM } from '@/context/CRMContext';
import { formatPhoneForDisplay } from '@/utils/phoneUtils';
import { Plus, Phone, User, Calendar } from 'lucide-react';

export const Leads: React.FC = () => {
  const { leads } = useCRM();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Leads</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <LeadForm onSuccess={handleAddSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {leads.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No leads yet. Add your first lead to get started!</p>
            </CardContent>
          </Card>
        ) : (
          leads.map((lead) => (
            <Card key={lead.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>{lead.name}</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    lead.status === 'Hot Lead' ? 'bg-red-100 text-red-800' :
                    lead.status === 'Closed' ? 'bg-green-100 text-green-800' :
                    lead.status === 'Lost' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {lead.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 mr-2" />
                  {formatPhoneForDisplay(lead.phone)}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(lead.createdAt).toLocaleDateString()}
                </div>
                {lead.notes && (
                  <p className="text-sm text-muted-foreground mt-2">{lead.notes}</p>
                )}
                {lead.feedback && (
                  <div className="text-sm">
                    <span className="font-medium">Feedback: </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      lead.feedback === 'Prospect' ? 'bg-green-100 text-green-800' :
                      lead.feedback === 'Follow-up' ? 'bg-yellow-100 text-yellow-800' :
                      lead.feedback === 'Visited' ? 'bg-blue-100 text-blue-800' :
                      lead.feedback === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.feedback}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
