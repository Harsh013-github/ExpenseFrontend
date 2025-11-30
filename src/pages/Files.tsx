import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { Upload, FileText, Trash2, Download, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface S3File {
  key: string;
  size: number;
  last_modified: string;
  etag: string;
  original_filename: string;
}

export default function Files() {
  const [files, setFiles] = useState<S3File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await api.listFiles();
      setFiles(response.data.files);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      await api.uploadFile(file);
      toast({
        title: "Success",
        description: `${file.name} uploaded successfully`,
      });
      loadFiles();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const filteredFiles = files.filter(file =>
    file.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">File Manager</h1>
            <p className="text-muted-foreground">Manage your uploaded files</p>
          </div>
          <div>
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileUpload}
              disabled={uploadingFile}
              className="hidden"
            />
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploadingFile}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploadingFile ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filteredFiles.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground mb-2">
                {searchQuery ? "No files found" : "No files uploaded yet"}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery ? "Try a different search term" : "Start by uploading your first file"}
              </p>
              {!searchQuery && (
                <Button onClick={() => document.getElementById('file-upload')?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload File
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            <div className="text-sm text-muted-foreground">
              {filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"} found
            </div>
            {filteredFiles.map((file) => (
              <Card key={file.key} className="shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{file.original_filename}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{format(parseISO(file.last_modified), "MMM dd, yyyy HH:mm")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const url = `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/s3/files/${file.key}`;
                        window.open(url, '_blank');
                      }}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
