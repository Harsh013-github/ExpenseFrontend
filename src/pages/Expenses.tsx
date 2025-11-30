import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, Expense, ExpenseCreate } from "@/lib/api";
import { Plus, Pencil, Trash2, Tag, Upload, X, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

// Safe date formatter
const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return "Invalid date";
  try {
    const date = parseISO(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return format(date, "MMM dd, yyyy");
  } catch {
    return "Invalid date";
  }
};

const expenseSchema = z.object({
  expense_date: z.string().min(1, "Date is required"),
  amount: z.number().positive("Amount must be positive").max(999999, "Amount too large"),
  category: z.string().min(1, "Category is required").max(100),
  merchant: z.string().max(200).optional(),
  note: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
});

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<ExpenseCreate>({
    user_id: user?.id || "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    amount: 0,
    category: "",
    merchant: "",
    note: "",
    tags: [],
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const response = await api.getExpenses();
      setExpenses(response.data || []);
    } catch (error) {
      setExpenses([]);
      // Show toast only in production, log in dev
      if (import.meta.env.PROD) {
        toast({
          title: "Error",
          description: "Failed to load expenses",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadingFile(true);

    try {
      const response = await api.uploadFile(file);
      const fileUrl = `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/s3/files/${response.data.file_key}`;
      
      const newAttachment = {
        name: response.data.original_filename,
        url: fileUrl,
      };

      setFormData({
        ...formData,
        attachments: [...(formData.attachments || []), newAttachment],
      });

      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      setSelectedFile(null);
    }
  };

  const removeAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments?.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = expenseSchema.safeParse(formData);
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }

    try {
      // Clean up data - send undefined for empty arrays
      const submitData = {
        ...formData,
        tags: formData.tags && formData.tags.length > 0 ? formData.tags : undefined,
        attachments: formData.attachments && formData.attachments.length > 0 ? formData.attachments : undefined,
      };

      if (editingExpense) {
        await api.updateExpense(editingExpense.id, submitData);
        toast({ title: "Success", description: "Expense updated successfully" });
      } else {
        await api.createExpense(submitData);
        toast({ title: "Success", description: "Expense created successfully" });
      }
      setDialogOpen(false);
      resetForm();
      loadExpenses();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Operation failed",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    try {
      await api.deleteExpense(id);
      toast({ title: "Success", description: "Expense deleted successfully" });
      loadExpenses();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      user_id: user?.id || "",
      expense_date: expense.expense_date,
      amount: expense.amount,
      category: expense.category,
      merchant: expense.merchant || "",
      note: expense.note || "",
      tags: expense.tags || [],
      attachments: expense.attachments || [],
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingExpense(null);
    setSelectedFile(null);
    setFormData({
      user_id: user?.id || "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      amount: 0,
      category: "",
      merchant: "",
      note: "",
      tags: [],
    });
  };

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
            <h1 className="text-3xl font-bold">Expenses</h1>
            <p className="text-muted-foreground">Manage your expenses</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
                <DialogDescription>
                  {editingExpense ? "Update the expense details below" : "Fill in the details for your new expense"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.expense_date}
                      onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount || ""}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Food, Transport, Entertainment"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merchant">Merchant (Optional)</Label>
                  <Input
                    id="merchant"
                    value={formData.merchant}
                    onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                    placeholder="Where did you spend?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note (Optional)</Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Any additional details..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="file">Attachments (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileSelect}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file')?.click()}
                      disabled={uploadingFile}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingFile ? "Uploading..." : "Upload File"}
                    </Button>
                  </div>
                  {formData.attachments && formData.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {formData.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 truncate text-sm">{attachment.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAttachment(index)}
                            className="h-6 w-6"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingExpense ? "Update" : "Create"} Expense
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {expenses.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-xl text-muted-foreground mb-4">No expenses yet</p>
              <p className="text-sm text-muted-foreground mb-6">Start tracking by adding your first expense</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Expense
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {expenses.map((expense) => (
              <Card key={expense.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{expense.merchant || expense.category}</h3>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {expense.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{expense.note}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{safeFormatDate(expense.expense_date)}</span>
                      {expense.tags && expense.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          <span>{expense.tags.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                      <p className="text-2xl font-bold">${expense.amount.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(expense)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
