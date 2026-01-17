'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Users,
  RefreshCw,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

// Types
interface Template {
  id: number;
  name: string;
  category: string;
  language: string;
  body_text: string;
  header_type?: string;
  header_text?: string;
  footer_text?: string;
  status: string;
  rejection_reason?: string;
  meta_template_id?: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

type SectionType = 'whatsapp' | 'users';

const ROLES = ['admin', 'sdr', 'manager'];

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<SectionType>('whatsapp');

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);

  // New template form
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'MARKETING',
    language: 'es',
    body_text: '',
  });

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<number | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch('/api/admin/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchTemplates();
    fetchUsers();
  }, [fetchTemplates, fetchUsers]);

  // Sync templates from Meta
  const handleSyncTemplates = async () => {
    try {
      setSyncingTemplates(true);
      const response = await fetch('/api/admin/templates/sync', { method: 'POST' });
      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Error syncing templates:', error);
    } finally {
      setSyncingTemplates(false);
    }
  };

  // Create template
  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.body_text) return;

    try {
      setCreatingTemplate(true);
      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      if (response.ok) {
        setShowCreateTemplate(false);
        setNewTemplate({ name: '', category: 'MARKETING', language: 'es', body_text: '' });
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Error creating template:', error);
    } finally {
      setCreatingTemplate(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      setDeletingTemplate(true);
      const response = await fetch(`/api/admin/templates/${templateToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTemplateToDelete(null);
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    } finally {
      setDeletingTemplate(false);
    }
  };

  // Toggle user active status
  const handleToggleUserActive = async (targetUser: User) => {
    try {
      setUpdatingUser(targetUser.id);
      const action = targetUser.is_active ? 'deactivate' : 'activate';
      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setUpdatingUser(null);
    }
  };

  // Change user role
  const handleChangeRole = async () => {
    if (!roleChangeUser || !newRole) return;

    try {
      setUpdatingUser(roleChangeUser.id);
      const response = await fetch(`/api/admin/users/${roleChangeUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'role', role: newRole }),
      });

      if (response.ok) {
        setRoleChangeUser(null);
        setNewRole('');
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error changing role:', error);
    } finally {
      setUpdatingUser(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      APPROVED: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      REJECTED: 'bg-red-100 text-red-700',
    };
    return (
      <Badge className={cn('text-xs', statusColors[status] || 'bg-gray-100 text-gray-700')}>
        {status}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      sdr: 'bg-blue-100 text-blue-700',
      manager: 'bg-green-100 text-green-700',
    };
    return (
      <Badge className={cn('text-xs', roleColors[role] || 'bg-gray-100 text-gray-700')}>
        {role}
      </Badge>
    );
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header activeTab="admin" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Administration</h2>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection('whatsapp')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                activeSection === 'whatsapp'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp Templates
            </button>
            <button
              onClick={() => setActiveSection('users')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                activeSection === 'users'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Users className="w-4 h-4" />
              User Management
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              {/* WhatsApp Templates Section */}
              {activeSection === 'whatsapp' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">WhatsApp Templates</h1>
                      <p className="text-gray-500 text-sm mt-1">
                        Manage your WhatsApp message templates
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleSyncTemplates}
                        disabled={syncingTemplates}
                      >
                        {syncingTemplates ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Sync from Meta
                      </Button>
                      <Button onClick={() => setShowCreateTemplate(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                      </Button>
                    </div>
                  </div>

                  {loadingTemplates ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardHeader>
                            <div className="h-5 bg-gray-200 rounded w-1/3" />
                            <div className="h-4 bg-gray-100 rounded w-1/4 mt-2" />
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  ) : templates.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500">No templates found</p>
                        <p className="text-gray-400 text-sm">
                          Create a new template or sync from Meta
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {templates.map((template) => (
                        <Card key={template.id}>
                          <CardHeader
                            className="cursor-pointer"
                            onClick={() =>
                              setExpandedTemplate(
                                expandedTemplate === template.id ? null : template.id
                              )
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                {getStatusBadge(template.status)}
                                <Badge variant="outline" className="text-xs">
                                  {template.category}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {template.language}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTemplateToDelete(template);
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                {expandedTemplate === template.id ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          {expandedTemplate === template.id && (
                            <CardContent className="pt-0">
                              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                                <p className="whitespace-pre-wrap">{template.body_text}</p>
                              </div>
                              {template.rejection_reason && (
                                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                  <p className="text-sm text-red-700">
                                    <strong>Rejection reason:</strong> {template.rejection_reason}
                                  </p>
                                </div>
                              )}
                              <div className="mt-3 text-xs text-gray-500">
                                Created: {new Date(template.created_at).toLocaleDateString()}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Users Section */}
              {activeSection === 'users' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                      <p className="text-gray-500 text-sm mt-1">
                        Manage user accounts and permissions
                      </p>
                    </div>
                    <Button variant="outline" onClick={fetchUsers}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {loadingUsers ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="py-4">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-gray-200 rounded-full" />
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-1/3" />
                                <div className="h-3 bg-gray-100 rounded w-1/4 mt-2" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : users.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Users className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500">No users found</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {users.map((u) => (
                        <Card key={u.id}>
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    'h-10 w-10 rounded-full flex items-center justify-center',
                                    u.is_active ? 'bg-green-100' : 'bg-gray-100'
                                  )}
                                >
                                  {u.role === 'admin' ? (
                                    <Shield className="w-5 h-5 text-purple-600" />
                                  ) : (
                                    <Users className="w-5 h-5 text-gray-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{u.email}</p>
                                    {getRoleBadge(u.role)}
                                    {!u.is_active && (
                                      <Badge variant="secondary" className="text-xs">
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    Joined {new Date(u.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setRoleChangeUser(u);
                                    setNewRole(u.role);
                                  }}
                                  disabled={updatingUser === u.id || u.id === user?.id}
                                >
                                  Change Role
                                </Button>
                                <Button
                                  variant={u.is_active ? 'outline' : 'default'}
                                  size="sm"
                                  onClick={() => handleToggleUserActive(u)}
                                  disabled={updatingUser === u.id || u.id === user?.id}
                                  className={cn(
                                    u.is_active
                                      ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                      : 'bg-green-600 hover:bg-green-700'
                                  )}
                                >
                                  {updatingUser === u.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : u.is_active ? (
                                    <>
                                      <UserX className="w-4 h-4 mr-1" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4 mr-1" />
                                      Activate
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Create Template Dialog */}
      <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a new WhatsApp message template. Templates must be approved by Meta before use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Template Name</label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="e.g., welcome_message"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use lowercase letters, numbers, and underscores only
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <Select
                  value={newTemplate.category}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Language</label>
                <Select
                  value={newTemplate.language}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, language: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Spanish (es)</SelectItem>
                    <SelectItem value="en">English (en)</SelectItem>
                    <SelectItem value="pt_BR">Portuguese (pt_BR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Message Body</label>
              <Textarea
                value={newTemplate.body_text}
                onChange={(e) => setNewTemplate({ ...newTemplate, body_text: e.target.value })}
                placeholder="Enter your message template..."
                className="mt-1 min-h-[120px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{{1}}'}, {'{{2}}'}, etc. for dynamic variables
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTemplate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={creatingTemplate || !newTemplate.name || !newTemplate.body_text}
            >
              {creatingTemplate ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template &quot;{templateToDelete?.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={deletingTemplate}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <Dialog open={!!roleChangeUser} onOpenChange={() => setRoleChangeUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {roleChangeUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700">New Role</label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={updatingUser === roleChangeUser?.id || newRole === roleChangeUser?.role}
            >
              {updatingUser === roleChangeUser?.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
