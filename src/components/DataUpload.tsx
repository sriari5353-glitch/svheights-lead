
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
import { Upload, FileSpreadsheet, Download, FileText, Globe, File } from "lucide-react";
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

type FileType = 'excel' | 'csv' | 'google-sheets' | 'other';

const DataUpload = () => {
  const { addLead, leads } = useCRM();
  const [isOpen, setIsOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
  const [mappedLeads, setMappedLeads] = useState<MappedLead[]>([]);
  const [step, setStep] = useState<'upload' | 'map' | 'review'>('upload');
  const [selectedFileType, setSelectedFileType] = useState<FileType>('excel');

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("File selected:", file.name, file.type, file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data: ParsedRow[] = [];
        const result = e.target?.result;

        if (file.name.endsWith('.csv') || file.type === 'text/csv') {
          console.log("Processing CSV file");
          const text = result as string;
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length === 0) {
            toast({ title: "Empty file", description: "The CSV file appears to be empty", variant: "destructive" });
            return;
          }
          
          const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, ''));
          console.log("CSV Headers:", headers);
          
          data = lines.slice(1).map((line, index) => {
            const values = parseCSVLine(line).map(v => v.replace(/"/g, ''));
            const row: ParsedRow = {};
            headers.forEach((header, headerIndex) => {
              row[header] = values[headerIndex] || '';
            });
            return row;
          }).filter(row => Object.values(row).some(value => value && value.toString().trim()));
          
        } else if (file.name.match(/\.(xlsx|xls)$/i) || file.type.includes('spreadsheet')) {
          console.log("Processing Excel file");
          const workbook = XLSX.read(result, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        } else {
          toast({ title: "Unsupported format", description: "Please upload a CSV or Excel file", variant: "destructive" });
          return;
        }

        console.log("Parsed data:", data);
        
        if (data.length === 0) {
          toast({ title: "No data found", description: "The file doesn't contain any valid data rows", variant: "destructive" });
          return;
        }

        setParsedData(data);
        setStep('map');
        toast({ title: "File uploaded", description: `${data.length} rows found and ready for mapping` });
      } catch (error) {
        console.error("File parsing error:", error);
        toast({ title: "Upload failed", description: "Could not parse the file. Please check the format.", variant: "destructive" });
      }
    };

    reader.onerror = () => {
      toast({ title: "File read error", description: "Could not read the file", variant: "destructive" });
    };

    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
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

  const downloadTemplate = (fileType: FileType) => {
    const template = [
      {
        Name: "John Doe",
        Phone: "9876543210",
        "Lead Date": "2024-01-15"
      },
      {
        Name: "Jane Smith", 
        Phone: "9123456789",
        "Lead Date": "2024-01-16"
      }
    ];

    if (fileType === 'csv') {
      // Create CSV content
      const headers = Object.keys(template[0]);
      const csvContent = [
        headers.join(','),
        ...template.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // Create Excel file
      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads Template");
      XLSX.writeFile(wb, "leads_template.xlsx");
    }
  };

  const resetUpload = () => {
    setParsedData([]);
    setColumnMapping({});
    setSelectedRows({});
    setMappedLeads([]);
    setStep('upload');
  };

  const handleGoogleSheetsImport = () => {
    toast({ 
      title: "Google Sheets Import", 
      description: "To import from Google Sheets, export your sheet as Excel (.xlsx) or CSV and upload it here.", 
    });
  };

  const getFileTypeIcon = (type: FileType) => {
    switch (type) {
      case 'excel': return <FileSpreadsheet className="h-5 w-5" />;
      case 'csv': return <FileText className="h-5 w-5" />;
      case 'google-sheets': return <Globe className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  const getAcceptedFileTypes = () => {
    switch (selectedFileType) {
      case 'excel': return '.xlsx,.xls';
      case 'csv': return '.csv';
      case 'google-sheets': return '.xlsx,.xls,.csv';
      default: return '.xlsx,.xls,.csv';
    }
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
          <DialogTitle>Upload Data from Multiple Sources</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[80vh] pr-4">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium">Choose your data source</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload Name, Phone, and Date data from various file formats
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedFileType === 'excel' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedFileType('excel')}
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-6 w-6 text-green-600" />
                      <div className="text-left">
                        <div className="font-medium">Excel Files</div>
                        <div className="text-sm text-muted-foreground">.xlsx, .xls</div>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedFileType === 'csv' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedFileType('csv')}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium">CSV Files</div>
                        <div className="text-sm text-muted-foreground">.csv</div>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedFileType === 'google-sheets' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedFileType('google-sheets')}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="h-6 w-6 text-orange-600" />
                      <div className="text-left">
                        <div className="font-medium">Google Sheets</div>
                        <div className="text-sm text-muted-foreground">Export & upload</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedFileType === 'google-sheets' ? (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                        <h4 className="font-medium text-blue-900 mb-2">How to import from Google Sheets:</h4>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                          <li>Open your Google Sheet</li>
                          <li>Go to File → Download → Microsoft Excel (.xlsx) or Comma Separated Values (.csv)</li>
                          <li>Upload the downloaded file using the button below</li>
                        </ol>
                      </div>
                      <Button variant="outline" onClick={handleGoogleSheetsImport} className="w-full">
                        <Globe className="h-4 w-4 mr-2" />
                        Learn More About Google Sheets Import
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        {getFileTypeIcon(selectedFileType)}
                        <span className="text-sm font-medium">
                          Upload {selectedFileType === 'excel' ? 'Excel' : 'CSV'} File
                        </span>
                      </div>
                      <Input
                        type="file"
                        accept={getAcceptedFileTypes()}
                        onChange={handleFileUpload}
                        className="cursor-pointer"
                      />
                    </>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => downloadTemplate(selectedFileType)} 
                      className="flex-1"
                      disabled={selectedFileType === 'google-sheets'}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download {selectedFileType === 'excel' ? 'Excel' : 'CSV'} Template
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
