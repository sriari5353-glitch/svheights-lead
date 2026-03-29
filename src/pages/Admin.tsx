import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  created_at: string;
  is_active: boolean;
}

const AdminPage: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [openReset, setOpenReset] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [editUsernameValue, setEditUsernameValue] = useState("");

  useEffect(() => {
    document.title = "Admin | LeadMate";
  }, []);

  const loadUsers = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "list" } });
      if (error) throw error;
      setUsers((data as any)?.users || []);
    } catch (e: any) {
      toast(e.message || "Failed to load users");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const createUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      toast("Enter username and password");
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { 
          action: "create", 
          username: newUsername.trim(), 
          email: newEmail.trim() || undefined,
          password: newPassword 
        },
      });
      if (error) throw error;
      toast("User created");
      setOpenCreate(false);
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      loadUsers();
    } catch (e: any) {
      toast(e.message || "Failed to create user");
    }
  };

  const resetPassword = async (userId: string) => {
    if (!newPwd.trim()) {
      toast("Enter a new password");
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: "reset_password", user_id: userId, password: newPwd },
      });
      if (error) throw error;
      toast("Password updated");
      setOpenReset(null);
      setNewPwd("");
    } catch (e: any) {
      toast(e.message || "Failed to reset password");
    }
  };

  const toggleActive = async (userId: string, next: boolean) => {
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: next ? "activate" : "deactivate", user_id: userId },
      });
      if (error) throw error;
      loadUsers();
    } catch (e: any) {
      toast(e.message || "Failed to update status");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", user_id: userId },
      });
      if (error) throw error;
      toast("User deleted");
      loadUsers();
    } catch (e: any) {
      toast(e.message || "Failed to delete user");
    }
  };

  const updateUsername = async (userId: string) => {
    if (!editUsernameValue.trim()) {
      toast("Enter a username");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_username", user_id: userId, username: editUsernameValue.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast("Username updated");
      setEditingUsername(null);
      loadUsers();
    } catch (e: any) {
      toast(e.message || "Failed to update username");
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadUsers} disabled={refreshing}>Refresh</Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button variant="hero">Create User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create new user</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Username</Label>
                  <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="unique username" />
                </div>
                <div className="grid gap-2">
                  <Label>Email (optional)</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="grid gap-2">
                  <Label>Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setOpenCreate(false)}>Cancel</Button>
                <Button variant="hero" onClick={createUser}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {editingUsername === u.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editUsernameValue}
                            onChange={(e) => setEditUsernameValue(e.target.value)}
                            className="h-7 w-32 text-sm"
                            onKeyDown={(e) => e.key === "Enter" && updateUsername(u.id)}
                          />
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => updateUsername(u.id)}>✓</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingUsername(null)}>✕</Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => { setEditingUsername(u.id); setEditUsernameValue(u.username || ""); }}
                        >
                          {u.username || "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.is_active ? "Yes" : "No"}</TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Dialog open={openReset === u.id} onOpenChange={(v) => setOpenReset(v ? u.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">Reset Password</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reset password</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-2">
                            <Label>New password</Label>
                            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                          </div>
                          <DialogFooter>
                            <Button variant="secondary" onClick={() => setOpenReset(null)}>Cancel</Button>
                            <Button variant="hero" onClick={() => resetPassword(u.id)}>Update</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="sm" onClick={() => toggleActive(u.id, !u.is_active)}>
                        {u.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteUser(u.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default AdminPage;
