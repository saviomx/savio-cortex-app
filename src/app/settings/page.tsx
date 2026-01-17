'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Phone,
  Globe,
  Mail,
  MapPin,
  FileText,
  RefreshCw,
  Save,
  Loader2,
  CheckCircle,
  Shield,
  MessageSquare,
  Users,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Check,
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

// Types
interface BusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profile_picture_url?: string;
  websites?: string[];
  vertical?: string;
  messaging_product?: string;
}

interface PhoneNumber {
  id: string;
  verified_name?: string;
  display_phone_number?: string;
  quality_rating?: string;
  code_verification_status?: string;
  is_official_business_account?: boolean;
  name_status?: string;
  platform_type?: string;
  account_mode?: string;
  messaging_limit_tier?: string;
  throughput?: {
    level?: string;
  };
}

interface Vertical {
  id: string;
  name: string;
}

// Helper to format vertical names for display
function formatVerticalName(vertical: string): string {
  return vertical
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

type SectionType = 'profile' | 'phone-numbers' | 'templates' | 'users';

const ROLES = ['admin', 'sdr', 'manager'];

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeSection, setActiveSection] = useState<SectionType>('profile');

  // Business Profile state
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<BusinessProfile>({});
  const [profileSaved, setProfileSaved] = useState(false);

  // Phone Numbers state
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loadingPhones, setLoadingPhones] = useState(true);

  // Verticals state
  const [verticals, setVerticals] = useState<Vertical[]>([]);

  // Templates state (admin only)
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'MARKETING',
    language: 'es',
    body_text: '',
  });

  // Users state (admin only)
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<number | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');

  // Fetch business profile
  const fetchProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const response = await fetch('/api/business/profile');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setProfile(data);
        setProfileForm({
          about: data.about || '',
          address: data.address || '',
          description: data.description || '',
          email: data.email || '',
          vertical: data.vertical || '',
          websites: data.websites || [],
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // Fetch phone numbers
  const fetchPhoneNumbers = useCallback(async () => {
    try {
      setLoadingPhones(true);
      const response = await fetch('/api/business/phone-numbers');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setPhoneNumbers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    } finally {
      setLoadingPhones(false);
    }
  }, []);

  // Fetch verticals
  const fetchVerticals = useCallback(async () => {
    try {
      const response = await fetch('/api/business/verticals');
      if (response.ok) {
        const result = await response.json();
        // API returns { verticals: [...] }
        const data = result.verticals || result.data || result;
        // Handle both string arrays and object arrays
        if (Array.isArray(data)) {
          const normalized = data.map((item) => {
            if (typeof item === 'string') {
              return { id: item, name: formatVerticalName(item) };
            }
            return item;
          });
          setVerticals(normalized);
        } else {
          setVerticals([]);
        }
      }
    } catch (error) {
      console.error('Error fetching verticals:', error);
    }
  }, []);

  // Fetch templates (admin only)
  const fetchTemplates = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoadingTemplates(true);
      const response = await fetch('/api/admin/templates');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  }, [isAdmin]);

  // Fetch users (admin only)
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin]);

  // Initial data fetch
  useEffect(() => {
    fetchProfile();
    fetchPhoneNumbers();
    fetchVerticals();
  }, [fetchProfile, fetchPhoneNumbers, fetchVerticals]);

  // Fetch admin data when user becomes admin
  useEffect(() => {
    if (isAdmin) {
      fetchTemplates();
      fetchUsers();
    }
  }, [isAdmin, fetchTemplates, fetchUsers]);

  // Save business profile
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setProfileSaved(false);

      const response = await fetch('/api/business/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      if (response.ok) {
        setProfileSaved(true);
        await fetchProfile();
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

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
  const handleToggleUserActive = async (userId: number, currentActive: boolean) => {
    try {
      setUpdatingUser(userId);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
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
        body: JSON.stringify({ role: newRole }),
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

  // Get template status badge
  const getTemplateBadge = (status: string) => {
    const colors: Record<string, string> = {
      APPROVED: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      REJECTED: 'bg-red-100 text-red-700',
    };
    return (
      <Badge className={cn('text-xs', colors[status] || 'bg-gray-100 text-gray-700')}>
        {status}
      </Badge>
    );
  };

  const getQualityBadge = (quality?: string) => {
    if (!quality) return null;
    const colors: Record<string, string> = {
      GREEN: 'bg-green-100 text-green-700',
      YELLOW: 'bg-yellow-100 text-yellow-700',
      RED: 'bg-red-100 text-red-700',
    };
    return (
      <Badge className={cn('text-xs', colors[quality] || 'bg-gray-100 text-gray-700')}>
        {quality}
      </Badge>
    );
  };

  const getVerificationBadge = (status?: string) => {
    if (!status) return null;
    const isVerified = status === 'VERIFIED';
    return (
      <Badge className={cn('text-xs', isVerified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}>
        {isVerified ? 'Verified' : status}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header activeTab="settings" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Settings</h2>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection('profile')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                activeSection === 'profile'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Building2 className="w-4 h-4" />
              Business Profile
            </button>
            <button
              onClick={() => setActiveSection('phone-numbers')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                activeSection === 'phone-numbers'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Phone className="w-4 h-4" />
              Phone Numbers
            </button>

            {/* Admin-only sections */}
            {isAdmin && (
              <>
                <div className="my-4 border-t border-gray-200" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                  Administration
                </p>
                <button
                  onClick={() => setActiveSection('templates')}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeSection === 'templates'
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
              </>
            )}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 max-w-4xl">
              {/* Business Profile Section */}
              {activeSection === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
                      <p className="text-gray-500 text-sm mt-1">
                        Manage your WhatsApp Business profile information
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={fetchProfile}
                        disabled={loadingProfile}
                      >
                        <RefreshCw className={cn('w-4 h-4 mr-2', loadingProfile && 'animate-spin')} />
                        Refresh
                      </Button>
                      <Button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                      >
                        {savingProfile ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : profileSaved ? (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {profileSaved ? 'Saved!' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>

                  {loadingProfile ? (
                    <Card className="animate-pulse">
                      <CardContent className="py-12">
                        <div className="space-y-4">
                          <div className="h-4 bg-gray-200 rounded w-1/3" />
                          <div className="h-10 bg-gray-100 rounded" />
                          <div className="h-4 bg-gray-200 rounded w-1/4" />
                          <div className="h-10 bg-gray-100 rounded" />
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {/* Profile Picture */}
                      {profile?.profile_picture_url && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Profile Picture</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <img
                              src={profile.profile_picture_url}
                              alt="Business profile"
                              className="w-24 h-24 rounded-lg object-cover"
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Basic Info */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Basic Information</CardTitle>
                          <CardDescription>
                            This information is displayed to your customers on WhatsApp
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              About
                            </label>
                            <Input
                              value={profileForm.about || ''}
                              onChange={(e) => setProfileForm({ ...profileForm, about: e.target.value })}
                              placeholder="Brief description of your business"
                              className="mt-1"
                              maxLength={139}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {(profileForm.about || '').length}/139 characters
                            </p>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Description
                            </label>
                            <Textarea
                              value={profileForm.description || ''}
                              onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                              placeholder="Detailed description of your business"
                              className="mt-1 min-h-[100px]"
                              maxLength={512}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {(profileForm.description || '').length}/512 characters
                            </p>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              Industry Vertical
                            </label>
                            <Select
                              value={profileForm.vertical || ''}
                              onValueChange={(value) => setProfileForm({ ...profileForm, vertical: value })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                              <SelectContent>
                                {verticals.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    {v.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Contact Info */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Email
                            </label>
                            <Input
                              type="email"
                              value={profileForm.email || ''}
                              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                              placeholder="business@example.com"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              Address
                            </label>
                            <Textarea
                              value={profileForm.address || ''}
                              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                              placeholder="Business address"
                              className="mt-1"
                              maxLength={256}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              Website
                            </label>
                            <Input
                              type="url"
                              value={profileForm.websites?.[0] || ''}
                              onChange={(e) => setProfileForm({ ...profileForm, websites: [e.target.value] })}
                              placeholder="https://example.com"
                              className="mt-1"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {/* Phone Numbers Section */}
              {activeSection === 'phone-numbers' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
                      <p className="text-gray-500 text-sm mt-1">
                        Manage your WhatsApp Business phone numbers
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={fetchPhoneNumbers}
                      disabled={loadingPhones}
                    >
                      <RefreshCw className={cn('w-4 h-4 mr-2', loadingPhones && 'animate-spin')} />
                      Refresh
                    </Button>
                  </div>

                  {loadingPhones ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="py-6">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 bg-gray-200 rounded-full" />
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-1/3" />
                                <div className="h-3 bg-gray-100 rounded w-1/4 mt-2" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : phoneNumbers.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Phone className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500">No phone numbers found</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {phoneNumbers.map((phone) => (
                        <Card key={phone.id}>
                          <CardContent className="py-6">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                  <Phone className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-gray-900">
                                      {phone.display_phone_number || phone.id}
                                    </p>
                                    {phone.is_official_business_account && (
                                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                                        <Shield className="w-3 h-3 mr-1" />
                                        Official
                                      </Badge>
                                    )}
                                  </div>
                                  {phone.verified_name && (
                                    <p className="text-sm text-gray-600 mt-0.5">
                                      {phone.verified_name}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    {getQualityBadge(phone.quality_rating)}
                                    {getVerificationBadge(phone.code_verification_status)}
                                    {phone.messaging_limit_tier && (
                                      <Badge variant="outline" className="text-xs">
                                        <MessageSquare className="w-3 h-3 mr-1" />
                                        {phone.messaging_limit_tier}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Additional Details */}
                            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                              {phone.platform_type && (
                                <div>
                                  <p className="text-xs text-gray-500">Platform</p>
                                  <p className="text-sm font-medium">{phone.platform_type}</p>
                                </div>
                              )}
                              {phone.account_mode && (
                                <div>
                                  <p className="text-xs text-gray-500">Account Mode</p>
                                  <p className="text-sm font-medium">{phone.account_mode}</p>
                                </div>
                              )}
                              {phone.name_status && (
                                <div>
                                  <p className="text-xs text-gray-500">Name Status</p>
                                  <p className="text-sm font-medium">{phone.name_status}</p>
                                </div>
                              )}
                              {phone.throughput?.level && (
                                <div>
                                  <p className="text-xs text-gray-500">Throughput</p>
                                  <p className="text-sm font-medium">{phone.throughput.level}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* WhatsApp Templates Section (Admin only) */}
              {activeSection === 'templates' && isAdmin && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">WhatsApp Templates</h1>
                      <p className="text-gray-500 text-sm mt-1">
                        Manage WhatsApp message templates for outbound messaging
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleSyncTemplates}
                        disabled={syncingTemplates}
                      >
                        <RefreshCw className={cn('w-4 h-4 mr-2', syncingTemplates && 'animate-spin')} />
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
                          <CardContent className="py-6">
                            <div className="space-y-3">
                              <div className="h-4 bg-gray-200 rounded w-1/3" />
                              <div className="h-3 bg-gray-100 rounded w-2/3" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : templates.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500">No templates found</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Click &quot;Sync from Meta&quot; to import templates or create a new one
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {templates.map((template) => (
                        <Card key={template.id}>
                          <CardContent className="py-4">
                            <div
                              className="flex items-start justify-between cursor-pointer"
                              onClick={() => setExpandedTemplate(
                                expandedTemplate === template.id ? null : template.id
                              )}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-900">{template.name}</p>
                                  {getTemplateBadge(template.status)}
                                  <Badge variant="outline" className="text-xs">
                                    {template.category}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {template.language}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {template.body_text}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTemplateToDelete(template);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                {expandedTemplate === template.id ? (
                                  <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </div>

                            {expandedTemplate === template.id && (
                              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                {template.header_text && (
                                  <div>
                                    <p className="text-xs text-gray-500 font-medium">Header</p>
                                    <p className="text-sm">{template.header_text}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs text-gray-500 font-medium">Body</p>
                                  <p className="text-sm whitespace-pre-wrap">{template.body_text}</p>
                                </div>
                                {template.footer_text && (
                                  <div>
                                    <p className="text-xs text-gray-500 font-medium">Footer</p>
                                    <p className="text-sm">{template.footer_text}</p>
                                  </div>
                                )}
                                {template.rejection_reason && (
                                  <div className="p-3 bg-red-50 rounded-md">
                                    <p className="text-xs text-red-600 font-medium">Rejection Reason</p>
                                    <p className="text-sm text-red-700">{template.rejection_reason}</p>
                                  </div>
                                )}
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                  {template.meta_template_id && (
                                    <span>Meta ID: {template.meta_template_id}</span>
                                  )}
                                  <span>
                                    Created: {new Date(template.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* User Management Section (Admin only) */}
              {activeSection === 'users' && isAdmin && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                      <p className="text-gray-500 text-sm mt-1">
                        Manage user accounts and permissions
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={fetchUsers}
                      disabled={loadingUsers}
                    >
                      <RefreshCw className={cn('w-4 h-4 mr-2', loadingUsers && 'animate-spin')} />
                      Refresh
                    </Button>
                  </div>

                  {loadingUsers ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="py-6">
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
                    <div className="space-y-4">
                      {users.map((u) => (
                        <Card key={u.id}>
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    'h-10 w-10 rounded-full flex items-center justify-center',
                                    u.is_active ? 'bg-green-100' : 'bg-gray-100'
                                  )}
                                >
                                  {u.is_active ? (
                                    <UserCheck className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <UserX className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{u.email}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                      className={cn(
                                        'text-xs',
                                        u.role === 'admin'
                                          ? 'bg-purple-100 text-purple-700'
                                          : u.role === 'manager'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-gray-100 text-gray-700'
                                      )}
                                    >
                                      {u.role}
                                    </Badge>
                                    <Badge
                                      className={cn(
                                        'text-xs',
                                        u.is_active
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-red-100 text-red-700'
                                      )}
                                    >
                                      {u.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
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
                                  onClick={() => handleToggleUserActive(u.id, u.is_active)}
                                  disabled={updatingUser === u.id || u.id === user?.id}
                                >
                                  {updatingUser === u.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : u.is_active ? (
                                    'Deactivate'
                                  ) : (
                                    'Activate'
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a new WhatsApp message template. Templates must be approved by Meta before use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Template Name</label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="e.g., order_confirmation"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
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
                <label className="text-sm font-medium">Language</label>
                <Select
                  value={newTemplate.language}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, language: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt_BR">Portuguese (BR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Message Body</label>
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
                <Check className="w-4 h-4 mr-2" />
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
              className="bg-red-600 hover:bg-red-700"
              disabled={deletingTemplate}
            >
              {deletingTemplate ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
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
            <label className="text-sm font-medium">Select Role</label>
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
