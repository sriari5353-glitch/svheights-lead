
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

interface ParsedRow {
  [key: string]: any;
}

interface MappedLead {
  name: string;
  phone: string;
  leadDate: string;
}

const DataUpload = () => {
  const { addLead, leads } = useCRM();
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
      leadDate: row[columnMapping.leadDate] || '',
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
      const result = addLead({
        name: lead.name,
        phone: lead.phone,
        source: "Walk-in",
        sourceDetails: "",
        status: "New Lead",
        notes: "",
        feedback: "",
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
        "Lead Date": "2024-01-15"
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
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Upload Data</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[80vh] pr-4">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium">Upload your data file</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload Name, Phone, and Date data. You can edit and add more details later.
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
                <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                  <div>• Name (required)</div>
                  <div>• Phone (required)</div>
                  <div>• Lead Date (optional)</div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Other details like source, status, notes can be added later through editing.
                </p>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Map Columns</h3>
                <Button variant="outline" onClick={resetUpload}>Start Over</Button>
              </div>
              
              <div className="grid grid-cols-1 gap-4 max-w-md">
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
                  <Label>Lead Date Column (Optional)</Label>
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
                      <TableHead>Lead Date</TableHead>
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
                        <TableCell>{lead.leadDate || "Not set"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> These leads will be imported with default values (Walk-in source, New Lead status). 
                  You can edit each lead individually to add more details like source, notes, feedback, etc.
                </p>
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

// Export a separate component for download functionality that can be used in contacts section
export const DownloadDataButton = () => {
  const { leads } = useCRM();

  const downloadAllData = () => {
    if (!leads || leads.length === 0) {
      toast({ title: "No data to download", description: "There are no contacts to export", variant: "destructive" });
      return;
    }

    // Export all lead data with complete information
    const exportData = leads.map(lead => ({
      Name: lead.name,
      Phone: lead.phone,
      Source: lead.source,
      "Source Details": lead.sourceDetails || '',
      Status: lead.status,
      Notes: lead.notes,
      Feedback: lead.feedback,
      "Lead Date": lead.leadDate || '',
      "Created Date": new Date(lead.createdAt).toLocaleDateString(),
      "Updated Date": new Date(lead.updatedAt).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Contacts Data");
    XLSX.writeFile(wb, `contacts_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ title: "Download successful", description: `${exportData.length} contacts exported` });
  };

  return (
    <Button variant="hero" className="shrink-0" onClick={downloadAllData}>
      <Download className="h-4 w-4 mr-2" />
      Download Data
    </Button>
  );
};

export default DataUpload;
