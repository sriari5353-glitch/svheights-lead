import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useCRM } from "@/context/CRMContext";
import type { Lead, LeadSource, LeadStatus, Feedback } from "@/types/crm";

interface ParsedRow {
  [key: string]: any;
}

interface MappedLead {
  name: string;
  phone: string;
  source: LeadSource;
  sourceDetails: string;
  status: LeadStatus;
  notes: string;
  feedback: Feedback | "";
  leadDate: string;
  bhkType?: string;
  instagram?: string;
  facebook?: string;
}

const SOURCE_OPTIONS: LeadSource[] = ["Walk-in", "Referral", "Social Media", "Other"];
const STATUS_OPTIONS: LeadStatus[] = ["New Lead", "Prospect", "Negotiation", "Hot Lead", "Closed", "Lost"];
const FEEDBACK_OPTIONS: Feedback[] = ["Prospect", "Follow-up", "Visited", "Rejected"];

const DataUpload = () => {
  const { addLead } = useCRM();
  const [isOpen, setIsOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
  const [mappedLeads, setMappedLeads] = useState<MappedLead[]>([]);
  const [step, setStep] = useState<'upload' | 'map' | 'review'>('upload');

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data: ParsedRow[] = [];
        const result = e.target?.result;

        if (file.name.endsWith('.csv')) {
          // Handle CSV
          const text = result as string;
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length === 0) return;
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: ParsedRow = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });
        } else {
          // Handle Excel files
          const workbook = XLSX.read(result, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        }

        setParsedData(data);
        setStep('map');
        toast({ title: "File uploaded", description: `${data.length} rows found` });
      } catch (error) {
        toast({ title: "Upload failed", description: "Could not parse the file", variant: "destructive" });
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const getAvailableColumns = () => {
    if (parsedData.length === 0) return [];
    return Object.keys(parsedData[0]);
  };

  const handleColumnMapping = () => {
    if (!columnMapping.name || !columnMapping.phone) {
      toast({ title: "Required fields", description: "Name and Phone are required", variant: "destructive" });
      return;
    }

    const mapped: MappedLead[] = parsedData.map(row => ({
      name: row[columnMapping.name] || '',
      phone: row[columnMapping.phone] || '',
      source: (row[columnMapping.source] as LeadSource) || "Other",
      sourceDetails: row[columnMapping.sourceDetails] || '',
      status: (row[columnMapping.status] as LeadStatus) || "New Lead",
      notes: row[columnMapping.notes] || '',
      feedback: (row[columnMapping.feedback] as Feedback) || "",
      leadDate: row[columnMapping.leadDate] || '',
      bhkType: row[columnMapping.bhkType] || '',
      instagram: row[columnMapping.instagram] || '',
      facebook: row[columnMapping.facebook] || '',
    }));

    setMappedLeads(mapped);
    // Select all rows by default
    const allSelected: Record<number, boolean> = {};
    mapped.forEach((_, index) => {
      allSelected[index] = true;
    });
    setSelectedRows(allSelected);
    setStep('review');
  };

  const handleImport = () => {
    const selectedLeads = mappedLeads.filter((_, index) => selectedRows[index]);
    let successCount = 0;
    let errorCount = 0;

    selectedLeads.forEach((lead) => {
      // Combine additional info into notes
      const additionalInfo = [];
      if (lead.bhkType) additionalInfo.push(`BHK: ${lead.bhkType}`);
      if (lead.instagram) additionalInfo.push(`IG: ${lead.instagram}`);
      if (lead.facebook) additionalInfo.push(`FB: ${lead.facebook}`);
      
      const combinedNotes = [lead.notes, ...additionalInfo].filter(Boolean).join('\n');

      const result = addLead({
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        sourceDetails: lead.sourceDetails,
        status: lead.status,
        notes: combinedNotes,
        feedback: lead.feedback || undefined,
        leadDate: lead.leadDate,
      });

      if (result.ok) {
        successCount++;
      } else {
        errorCount++;
      }
    });

    toast({ 
      title: "Import completed", 
      description: `${successCount} leads imported${errorCount > 0 ? `, ${errorCount} failed` : ''}` 
    });

    // Reset and close
    setParsedData([]);
    setColumnMapping({});
    setSelectedRows({});
    setMappedLeads([]);
    setStep('upload');
    setIsOpen(false);
  };

  const downloadTemplate = () => {
    const template = [
      {
        Name: "John Doe",
        Phone: "9876543210",
        Source: "Social Media",
        "Source Details": "Facebook Ad",
        Status: "New Lead",
        Notes: "Interested in 2BHK",
        Feedback: "Prospect",
        "Lead Date": "2024-01-15",
        "BHK Type": "2BHK",
        Instagram: "@johndoe",
        Facebook: "john.doe.123"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads Template");
    XLSX.writeFile(wb, "leads_template.xlsx");
  };

  const resetUpload = () => {
    setParsedData([]);
    setColumnMapping({});
    setSelectedRows({});
    setMappedLeads([]);
    setStep('upload');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="shrink-0">
          <Upload className="h-4 w-4 mr-2" />
          Upload Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Leads from File</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[80vh] pr-4">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium">Upload your data file</h3>
                  <p className="text-sm text-muted-foreground">
                    Supported formats: Excel (.xlsx, .xls), CSV (.csv)
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={downloadTemplate} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Expected columns:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>• Name (required)</div>
                  <div>• Phone (required)</div>
                  <div>• Source</div>
                  <div>• Source Details</div>
                  <div>• Status</div>
                  <div>• Notes</div>
                  <div>• Feedback</div>
                  <div>• Lead Date</div>
                  <div>• BHK Type</div>
                  <div>• Instagram</div>
                  <div>• Facebook</div>
                </div>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Map Columns</h3>
                <Button variant="outline" onClick={resetUpload}>Start Over</Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label>Name Column *</Label>
                    <Select value={columnMapping.name} onValueChange={(v) => setColumnMapping({...columnMapping, name: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for Name" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Phone Column *</Label>
                    <Select value={columnMapping.phone} onValueChange={(v) => setColumnMapping({...columnMapping, phone: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for Phone" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Source Column</Label>
                    <Select value={columnMapping.source || "none"} onValueChange={(v) => setColumnMapping({...columnMapping, source: v === "none" ? "" : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Source Details Column</Label>
                    <Select value={columnMapping.sourceDetails || "none"} onValueChange={(v) => setColumnMapping({...columnMapping, sourceDetails: v === "none" ? "" : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for Source Details" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status Column</Label>
                    <Select value={columnMapping.status || "none"} onValueChange={(v) => setColumnMapping({...columnMapping, status: v === "none" ? "" : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Notes Column</Label>
                    <Select value={columnMapping.notes || "none"} onValueChange={(v) => setColumnMapping({...columnMapping, notes: v === "none" ? "" : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for Notes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Feedback Column</Label>
                    <Select value={columnMapping.feedback || "none"} onValueChange={(v) => setColumnMapping({...columnMapping, feedback: v === "none" ? "" : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for Feedback" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Lead Date Column</Label>
                    <Select value={columnMapping.leadDate || "none"} onValueChange={(v) => setColumnMapping({...columnMapping, leadDate: v === "none" ? "" : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for Lead Date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>BHK Type Column</Label>
                    <Select value={columnMapping.bhkType || "none"} onValueChange={(v) => setColumnMapping({...columnMapping, bhkType: v === "none" ? "" : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for BHK Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Instagram Column</Label>
                    <Select value={columnMapping.instagram || "none"} onValueChange={(v) => setColumnMapping({...columnMapping, instagram: v === "none" ? "" : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for Instagram" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Facebook Column</Label>
                    <Select value={columnMapping.facebook || "none"} onValueChange={(v) => setColumnMapping({...columnMapping, facebook: v === "none" ? "" : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for Facebook" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getAvailableColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetUpload}>Cancel</Button>
                <Button onClick={handleColumnMapping}>Next: Review Data</Button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Review & Import ({mappedLeads.length} leads)</h3>
                <Button variant="outline" onClick={() => setStep('map')}>Back to Mapping</Button>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={Object.values(selectedRows).every(Boolean)}
                  onCheckedChange={(checked) => {
                    const newSelection: Record<number, boolean> = {};
                    mappedLeads.forEach((_, index) => {
                      newSelection[index] = Boolean(checked);
                    });
                    setSelectedRows(newSelection);
                  }}
                />
                <Label>Select All</Label>
                <span className="text-sm text-muted-foreground">
                  ({Object.values(selectedRows).filter(Boolean).length} selected)
                </span>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>BHK</TableHead>
                      <TableHead>IG</TableHead>
                      <TableHead>FB</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedLeads.map((lead, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedRows[index] || false}
                            onCheckedChange={(checked) => 
                              setSelectedRows({...selectedRows, [index]: Boolean(checked)})
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.phone}</TableCell>
                        <TableCell>{lead.source}</TableCell>
                        <TableCell>{lead.status}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{lead.notes}</TableCell>
                        <TableCell>{lead.bhkType}</TableCell>
                        <TableCell>{lead.instagram}</TableCell>
                        <TableCell>{lead.facebook}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetUpload}>Cancel</Button>
                <Button onClick={handleImport}>
                  Import Selected ({Object.values(selectedRows).filter(Boolean).length})
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DataUpload;
