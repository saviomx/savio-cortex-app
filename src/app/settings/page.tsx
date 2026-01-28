'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  Image as ImageIcon,
  Video,
  File,
  X,
  Link,
  AlertCircle,
  Sparkles,
  LogOut,
  Crown,
  Briefcase,
  UserCog,
  Eye,
  PlayCircle,
  Search,
  Clock,
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

interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
  text?: string;
  url?: string;
  phone_number?: string;
  example?: string[];
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
  buttons_json?: { buttons: TemplateButton[] };
  status: string;
  rejection_reason?: string;
  meta_template_id?: string;
  created_at: string;
  updated_at: string;
}

type HeaderType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION' | '';
type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';

interface NewTemplateState {
  name: string;
  category: string;
  language: string;
  body_text: string;
  header_type: HeaderType;
  header_text: string;
  header_handle: string;
  header_media_url: string;
  footer_text: string;
  buttons: TemplateButton[];
  parameter_examples: Record<string, string>;
}

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

type SectionType = 'profile' | 'phone-numbers' | 'templates' | 'users';
type UserFilterTab = 'all' | 'active' | 'inactive';
type UserRoleFilter = 'all' | 'admin' | 'manager' | 'sdr';

const ROLES = ['admin', 'sdr', 'manager'];

const VALID_SECTIONS: SectionType[] = ['profile', 'phone-numbers', 'templates', 'users'];

// Loading skeleton for Suspense fallback
function SettingsLoadingSkeleton() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header activeTab="settings" />
      <div className="flex flex-1 overflow-hidden pb-14 md:pb-0">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-8 w-8 bg-gray-200 rounded-full" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Main settings content (uses useSearchParams)
function SettingsPageContent() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get section from URL or default to 'profile'
  const sectionFromUrl = searchParams.get('section') as SectionType | null;
  const initialSection = sectionFromUrl && VALID_SECTIONS.includes(sectionFromUrl) ? sectionFromUrl : 'profile';

  const [activeSection, setActiveSection] = useState<SectionType>(initialSection);
  const [userFilterTab, setUserFilterTab] = useState<UserFilterTab>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Update URL when section changes
  const handleSectionChange = useCallback((section: SectionType) => {
    setActiveSection(section);
    router.push(`/settings?section=${section}`, { scroll: false });
  }, [router]);

  // Sync with URL on mount and when URL changes
  useEffect(() => {
    const section = searchParams.get('section') as SectionType | null;
    if (section && VALID_SECTIONS.includes(section)) {
      setActiveSection(section);
    }
  }, [searchParams]);

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
  const [templateStatusTab, setTemplateStatusTab] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'LOCAL_ONLY' | 'DELETED'>('APPROVED');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);
  const [newTemplate, setNewTemplate] = useState<NewTemplateState>({
    name: '',
    category: '',  // Empty = auto-detect
    language: '',  // Empty = auto-detect
    body_text: '',
    header_type: '',
    header_text: '',
    header_handle: '',
    header_media_url: '',
    footer_text: '',
    buttons: [],
    parameter_examples: {},
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFileName, setMediaFileName] = useState<string>('');

  // New template filtering & pagination state
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('all');
  const [templateLanguageFilter, setTemplateLanguageFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [currentTemplatePage, setCurrentTemplatePage] = useState(1);
  const TEMPLATES_PER_PAGE = 10;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(templateSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [templateSearchQuery]);

  // Users state (admin only)
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<number | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');

  // Filtered users based on search, status, and role
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search filter
      const matchesSearch = !userSearchQuery ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(userSearchQuery.toLowerCase());

      // Status filter
      const matchesStatus = userFilterTab === 'all' ||
        (userFilterTab === 'active' && u.is_active) ||
        (userFilterTab === 'inactive' && !u.is_active);

      // Role filter
      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, userSearchQuery, userFilterTab, userRoleFilter]);

  // User counts by category
  const userCounts = useMemo(() => ({
    all: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    admin: users.filter(u => u.role === 'admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    sdr: users.filter(u => u.role === 'sdr').length,
  }), [users]);

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

  // Fetch templates (admin only) - fetches all statuses for client-side filtering
  const fetchTemplates = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoadingTemplates(true);
      // Fetch all statuses in parallel and combine
      const statuses = ['APPROVED', 'PENDING', 'LOCAL_ONLY', 'DELETED', 'REJECTED'];
      const responses = await Promise.all(
        statuses.map(status => fetch(`/api/admin/templates?status=${status}`))
      );

      const allTemplates: Template[] = [];
      for (const response of responses) {
        if (response.ok) {
          const result = await response.json();
          const data = result.items || result.data || result;
          if (Array.isArray(data)) {
            allTemplates.push(...data);
          }
        }
      }

      // Deduplicate by id just in case
      const uniqueTemplates = allTemplates.filter(
        (t, index, self) => index === self.findIndex(x => x.id === t.id)
      );

      setTemplates(uniqueTemplates);
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

  // Client-side template filtering with debounced search
  const filteredTemplates = useMemo(() => {
    const searchLower = debouncedSearchQuery.toLowerCase();
    return templates.filter(t => {
      // Status filter
      const matchesStatus = templateStatusTab === 'ALL' ||
        (templateStatusTab === 'APPROVED' && t.status === 'APPROVED') ||
        (templateStatusTab === 'PENDING' && t.status === 'PENDING') ||
        (templateStatusTab === 'LOCAL_ONLY' && t.status === 'LOCAL_ONLY') ||
        (templateStatusTab === 'DELETED' && t.status === 'DELETED');

      // Search filter - searches name, body_text, and meta_template_id
      const matchesSearch = !debouncedSearchQuery ||
        t.name.toLowerCase().includes(searchLower) ||
        t.body_text?.toLowerCase().includes(searchLower) ||
        t.meta_template_id?.toLowerCase().includes(searchLower);

      // Category filter
      const matchesCategory = templateCategoryFilter === 'all' || t.category === templateCategoryFilter;

      // Language filter
      const matchesLanguage = templateLanguageFilter === 'all' || t.language === templateLanguageFilter;

      return matchesStatus && matchesSearch && matchesCategory && matchesLanguage;
    });
  }, [templates, templateStatusTab, debouncedSearchQuery, templateCategoryFilter, templateLanguageFilter]);

  // Paginated templates
  const paginatedTemplates = useMemo(() => {
    const start = (currentTemplatePage - 1) * TEMPLATES_PER_PAGE;
    return filteredTemplates.slice(start, start + TEMPLATES_PER_PAGE);
  }, [filteredTemplates, currentTemplatePage, TEMPLATES_PER_PAGE]);

  const totalTemplatePages = Math.ceil(filteredTemplates.length / TEMPLATES_PER_PAGE);

  // Available languages from templates (for dropdown)
  const availableLanguages = useMemo(() => {
    const langs = new Set(templates.map(t => t.language));
    return Array.from(langs).sort();
  }, [templates]);

  // Template counts by status
  const templateCounts = useMemo(() => ({
    ALL: templates.length,
    APPROVED: templates.filter(t => t.status === 'APPROVED').length,
    PENDING: templates.filter(t => t.status === 'PENDING').length,
    LOCAL_ONLY: templates.filter(t => t.status === 'LOCAL_ONLY').length,
    DELETED: templates.filter(t => t.status === 'DELETED').length,
  }), [templates]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentTemplatePage(1);
  }, [templateStatusTab, debouncedSearchQuery, templateCategoryFilter, templateLanguageFilter]);

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

  // Upload media for template header
  const handleMediaUpload = async (file: File) => {
    try {
      setUploadingMedia(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/templates/upload-media', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setNewTemplate({
          ...newTemplate,
          header_handle: result.header_handle,
          header_media_url: result.url || ''
        });
        setMediaFileName(file.name);
        if (result.warning) {
          alert(`Warning: ${result.warning}`);
        }
      } else {
        const error = await response.json();
        console.error('Media upload failed:', error);
        alert(`Upload failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
    } finally {
      setUploadingMedia(false);
    }
  };

  // Add button to template
  const addButton = (type: ButtonType) => {
    const newButton: TemplateButton = { type, text: '' };
    if (type === 'URL') newButton.url = '';
    if (type === 'PHONE_NUMBER') newButton.phone_number = '';
    setNewTemplate({ ...newTemplate, buttons: [...newTemplate.buttons, newButton] });
  };

  // Update button
  const updateButton = (index: number, field: string, value: string) => {
    const updatedButtons = [...newTemplate.buttons];
    updatedButtons[index] = { ...updatedButtons[index], [field]: value };
    setNewTemplate({ ...newTemplate, buttons: updatedButtons });
  };

  // Remove button
  const removeButton = (index: number) => {
    const updatedButtons = newTemplate.buttons.filter((_, i) => i !== index);
    setNewTemplate({ ...newTemplate, buttons: updatedButtons });
  };

  // Reset template form
  const resetTemplateForm = () => {
    setNewTemplate({
      name: '',
      category: '',
      language: '',
      body_text: '',
      header_type: '',
      header_text: '',
      header_handle: '',
      header_media_url: '',
      footer_text: '',
      buttons: [],
      parameter_examples: {},
    });
    setMediaFileName('');
  };

  // Create template
  const handleCreateTemplate = async () => {
    try {
      setCreatingTemplate(true);

      // Build the request payload - only include fields that have values
      const payload: Record<string, unknown> = {
        name: newTemplate.name,
        body_text: newTemplate.body_text,
      };

      // Only include category/language if explicitly set (otherwise backend auto-detects)
      if (newTemplate.category) payload.category = newTemplate.category;
      if (newTemplate.language) payload.language = newTemplate.language;

      // Header configuration
      if (newTemplate.header_type) {
        payload.header_type = newTemplate.header_type;
        if (newTemplate.header_type === 'TEXT' && newTemplate.header_text) {
          payload.header_text = newTemplate.header_text;
        } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(newTemplate.header_type) && newTemplate.header_handle) {
          payload.header_handle = newTemplate.header_handle;
          if (newTemplate.header_media_url) {
            payload.header_media_url = newTemplate.header_media_url;
          }
        }
      }

      // Footer
      if (newTemplate.footer_text) payload.footer_text = newTemplate.footer_text;

      // Buttons
      if (newTemplate.buttons.length > 0) {
        payload.buttons = newTemplate.buttons;
      }

      // Parameter examples (if any)
      if (Object.keys(newTemplate.parameter_examples).length > 0) {
        payload.parameter_examples = newTemplate.parameter_examples;
      }

      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowCreateTemplate(false);
        resetTemplateForm();
        await fetchTemplates();
      } else {
        const error = await response.json();
        alert(`Failed to create template: ${error.error || 'Unknown error'}`);
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
      const action = currentActive ? 'deactivate' : 'activate';
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        await fetchUsers();
      } else {
        const error = await response.json();
        console.error('Error updating user:', error);
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
      } else {
        const error = await response.json();
        console.error('Error changing role:', error);
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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header activeTab="settings" />

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden pb-14 md:pb-0">
        {/* Mobile Tabs */}
        <div className="md:hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex overflow-x-auto px-2 py-2 gap-2 no-scrollbar">
            <button
              onClick={() => handleSectionChange('profile')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                activeSection === 'profile'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              )}
            >
              <Building2 className="w-4 h-4" />
              Profile
            </button>
            <button
              onClick={() => handleSectionChange('phone-numbers')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                activeSection === 'phone-numbers'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              )}
            >
              <Phone className="w-4 h-4" />
              Phones
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => handleSectionChange('templates')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                    activeSection === 'templates'
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  Templates
                </button>
                <button
                  onClick={() => handleSectionChange('users')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                    activeSection === 'users'
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  <Users className="w-4 h-4" />
                  Users
                </button>
              </>
            )}
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Settings</h2>
          <nav className="space-y-1 flex-1">
            <button
              onClick={() => handleSectionChange('profile')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                activeSection === 'profile'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <Building2 className="w-4 h-4" />
              Business Profile
            </button>
            <button
              onClick={() => handleSectionChange('phone-numbers')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                activeSection === 'phone-numbers'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <Phone className="w-4 h-4" />
              Phone Numbers
            </button>
            {/* Admin-only sections */}
            {isAdmin && (
              <>
                <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">
                  Administration
                </p>
                <button
                  onClick={() => handleSectionChange('templates')}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeSection === 'templates'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp Templates
                </button>
                <button
                  onClick={() => handleSectionChange('users')}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeSection === 'users'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
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
            <div className={cn("p-4 sm:p-6", activeSection === 'templates' ? 'max-w-6xl' : 'max-w-4xl')}>
              {/* Business Profile Section */}
              {activeSection === 'profile' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Business Profile</h1>
                      <p className="text-gray-500 text-sm mt-1">
                        Manage your WhatsApp Business profile
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchProfile}
                        disabled={loadingProfile}
                      >
                        <RefreshCw className={cn('w-4 h-4 sm:mr-2', loadingProfile && 'animate-spin')} />
                        <span className="hidden sm:inline">Refresh</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                      >
                        {savingProfile ? (
                          <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                        ) : profileSaved ? (
                          <CheckCircle className="w-4 h-4 sm:mr-2" />
                        ) : (
                          <Save className="w-4 h-4 sm:mr-2" />
                        )}
                        <span className="hidden sm:inline">{profileSaved ? 'Saved!' : 'Save Changes'}</span>
                        <span className="sm:hidden">{profileSaved ? 'Saved!' : 'Save'}</span>
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Phone Numbers</h1>
                      <p className="text-gray-500 text-sm mt-1">
                        Manage your WhatsApp Business phone numbers
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
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
                          <CardContent className="py-4 sm:py-6">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                              <div className="flex items-start gap-3 sm:gap-4">
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
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
                                    <p className="text-sm text-gray-600 mt-0.5 truncate">
                                      {phone.verified_name}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
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

              {/* WhatsApp Templates Section (Admin only) - Redesigned */}
              {activeSection === 'templates' && isAdmin && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">WhatsApp Templates</h1>
                      <p className="text-gray-500 text-sm mt-1">
                        Manage your message templates
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncTemplates}
                        disabled={syncingTemplates}
                      >
                        <RefreshCw className={cn('w-4 h-4 mr-2', syncingTemplates && 'animate-spin')} />
                        Sync
                      </Button>
                      <Button size="sm" onClick={() => setShowCreateTemplate(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New
                      </Button>
                    </div>
                  </div>

                  {/* Search & Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by name, message, or Meta ID..."
                        value={templateSearchQuery}
                        onChange={(e) => setTemplateSearchQuery(e.target.value)}
                        className="pl-9 h-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
                        <SelectTrigger className="flex-1 sm:flex-none sm:w-[150px] h-10">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="MARKETING">Marketing</SelectItem>
                          <SelectItem value="UTILITY">Utility</SelectItem>
                          <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={templateLanguageFilter} onValueChange={setTemplateLanguageFilter}>
                        <SelectTrigger className="flex-1 sm:flex-none sm:w-[150px] h-10">
                          <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Languages</SelectItem>
                          {availableLanguages.map(lang => (
                            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                    <button
                      onClick={() => setTemplateStatusTab('ALL')}
                      className={cn(
                        'inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                        templateStatusTab === 'ALL'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <MessageSquare className={cn('w-3.5 h-3.5', templateStatusTab === 'ALL' ? 'text-white' : 'text-gray-500')} />
                      All ({templateCounts.ALL})
                    </button>
                    <button
                      onClick={() => setTemplateStatusTab('APPROVED')}
                      className={cn(
                        'inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                        templateStatusTab === 'APPROVED'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <CheckCircle className={cn('w-3.5 h-3.5', templateStatusTab === 'APPROVED' ? 'text-white' : 'text-green-500')} />
                      Active ({templateCounts.APPROVED})
                    </button>
                    <button
                      onClick={() => setTemplateStatusTab('PENDING')}
                      className={cn(
                        'inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                        templateStatusTab === 'PENDING'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <Clock className={cn('w-3.5 h-3.5', templateStatusTab === 'PENDING' ? 'text-white' : 'text-yellow-500')} />
                      Pending ({templateCounts.PENDING})
                    </button>
                    <button
                      onClick={() => setTemplateStatusTab('LOCAL_ONLY')}
                      className={cn(
                        'inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                        templateStatusTab === 'LOCAL_ONLY'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <X className={cn('w-3.5 h-3.5', templateStatusTab === 'LOCAL_ONLY' ? 'text-white' : 'text-red-500')} />
                      Rejected ({templateCounts.LOCAL_ONLY})
                    </button>
                  </div>

                  {/* Content */}
                  {loadingTemplates ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-1/4" />
                                <div className="h-3 bg-gray-100 rounded w-3/4" />
                              </div>
                              <div className="h-6 bg-gray-100 rounded w-16" />
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
                          Click &quot;Sync&quot; to import templates or create a new one
                        </p>
                      </CardContent>
                    </Card>
                  ) : filteredTemplates.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Search className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500">No templates match your filters</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Try adjusting your search or filter criteria
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Template List */}
                      <div className="space-y-2">
                        {paginatedTemplates.map((template) => (
                          <Card
                            key={template.id}
                            className="cursor-pointer transition-all hover:bg-gray-50 active:bg-gray-100"
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <CardContent className="p-3 sm:p-4">
                              {/* Mobile: Stack layout, Desktop: Row layout */}
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                                <div className="flex-1 min-w-0">
                                  {/* Name and badges row */}
                                  <div className="flex items-center justify-between sm:justify-start gap-2 mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-medium text-gray-900 truncate">{template.name}</span>
                                      <Badge variant="outline" className="text-xs flex-shrink-0">{template.language}</Badge>
                                    </div>
                                    {/* Mobile: Status badge on same row */}
                                    <div className="sm:hidden flex items-center gap-1">
                                      {getTemplateBadge(template.status)}
                                    </div>
                                  </div>
                                  {/* Preview text */}
                                  <p className="text-sm text-gray-500 line-clamp-2 sm:line-clamp-1">
                                    {template.body_text}
                                  </p>
                                </div>
                                {/* Desktop: Status and actions */}
                                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                                  {getTemplateBadge(template.status)}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTemplateToDelete(template);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalTemplatePages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                          <p className="text-sm text-gray-500 order-2 sm:order-1">
                            {((currentTemplatePage - 1) * TEMPLATES_PER_PAGE) + 1}-{Math.min(currentTemplatePage * TEMPLATES_PER_PAGE, filteredTemplates.length)} of {filteredTemplates.length}
                          </p>
                          <div className="flex items-center gap-1 order-1 sm:order-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentTemplatePage(p => Math.max(1, p - 1))}
                              disabled={currentTemplatePage === 1}
                              className="h-9 px-3"
                            >
                              <ChevronLeft className="w-4 h-4 mr-1" />
                              Prev
                            </Button>
                            <div className="hidden sm:flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalTemplatePages) }, (_, i) => {
                                let pageNum: number;
                                if (totalTemplatePages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentTemplatePage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentTemplatePage >= totalTemplatePages - 2) {
                                  pageNum = totalTemplatePages - 4 + i;
                                } else {
                                  pageNum = currentTemplatePage - 2 + i;
                                }
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={currentTemplatePage === pageNum ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setCurrentTemplatePage(pageNum)}
                                    className="h-9 w-9 p-0"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                            </div>
                            <span className="sm:hidden text-sm text-gray-600 px-2">
                              {currentTemplatePage} / {totalTemplatePages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentTemplatePage(p => Math.min(totalTemplatePages, p + 1))}
                              disabled={currentTemplatePage === totalTemplatePages}
                              className="h-9 px-3"
                            >
                              Next
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Template Detail Dialog */}
              <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
                <DialogContent className="w-[95vw] max-w-[600px] max-h-[85vh] overflow-y-auto">
                  {selectedTemplate && (
                    <>
                      <DialogHeader>
                        <DialogTitle className="text-lg">{selectedTemplate.name}</DialogTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {getTemplateBadge(selectedTemplate.status)}
                          <Badge variant="outline" className="text-xs">{selectedTemplate.category}</Badge>
                          <Badge variant="outline" className="text-xs">{selectedTemplate.language}</Badge>
                        </div>
                      </DialogHeader>

                      {/* WhatsApp Preview */}
                      <div className="bg-[#efeae2] rounded-lg p-4 my-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Eye className="w-4 h-4 text-[#667781]" />
                          <span className="text-xs font-medium text-[#667781]">Message Preview</span>
                        </div>
                        <div className="bg-[#d9fdd3] rounded-lg shadow-sm max-w-[320px] overflow-hidden">
                          {/* Media Header */}
                          {selectedTemplate.header_type && ['VIDEO', 'IMAGE', 'DOCUMENT'].includes(selectedTemplate.header_type) && (
                            <div className="relative bg-[#c8e6c3]">
                              {selectedTemplate.header_type === 'VIDEO' && (
                                <div className="w-full h-32 flex items-center justify-center">
                                  <div className="text-center text-[#667781]">
                                    <PlayCircle className="w-10 h-10 mx-auto" />
                                    <span className="text-xs mt-1 block">Video</span>
                                  </div>
                                </div>
                              )}
                              {selectedTemplate.header_type === 'IMAGE' && (
                                <div className="w-full h-32 flex items-center justify-center">
                                  <div className="text-center text-[#667781]">
                                    <ImageIcon className="w-10 h-10 mx-auto" />
                                    <span className="text-xs mt-1 block">Image</span>
                                  </div>
                                </div>
                              )}
                              {selectedTemplate.header_type === 'DOCUMENT' && (
                                <div className="w-full h-20 flex items-center justify-center">
                                  <div className="text-center text-[#667781]">
                                    <File className="w-8 h-8 mx-auto" />
                                    <span className="text-xs mt-1 block">Document</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Text Header */}
                          {selectedTemplate.header_text && (
                            <p className="text-sm font-semibold text-[#111b21] px-3 pt-2">
                              {selectedTemplate.header_text}
                            </p>
                          )}
                          {/* Body */}
                          <p className="text-sm text-[#111b21] whitespace-pre-wrap px-3 py-2">
                            {selectedTemplate.body_text}
                          </p>
                          {/* Footer */}
                          {selectedTemplate.footer_text && (
                            <p className="text-xs text-[#667781] px-3 pb-2">
                              {selectedTemplate.footer_text}
                            </p>
                          )}
                          {/* Buttons */}
                          {selectedTemplate.buttons_json?.buttons && selectedTemplate.buttons_json.buttons.length > 0 && (
                            <div className="border-t border-[#c8e6c3] divide-y divide-[#c8e6c3]">
                              {selectedTemplate.buttons_json.buttons.map((btn, idx) => (
                                <div key={idx} className="px-3 py-2 text-center text-sm text-[#00a884] font-medium">
                                  {btn.type === 'URL' && <Link className="w-3 h-3 inline mr-1" />}
                                  {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3 inline mr-1" />}
                                  {btn.type === 'QUICK_REPLY' && <MessageSquare className="w-3 h-3 inline mr-1" />}
                                  {btn.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rejection Reason */}
                      {selectedTemplate.rejection_reason && (
                        <div className="p-3 bg-red-50 rounded-md mb-4">
                          <p className="text-xs text-red-600 font-medium">Rejection Reason</p>
                          <p className="text-sm text-red-700">{selectedTemplate.rejection_reason}</p>
                        </div>
                      )}

                      {/* Template Metadata */}
                      <div className="grid grid-cols-2 gap-3 text-sm border-t pt-4">
                        {selectedTemplate.meta_template_id && (
                          <div>
                            <p className="text-xs text-gray-500">Meta ID</p>
                            <p className="font-mono text-gray-900 text-xs">{selectedTemplate.meta_template_id}</p>
                          </div>
                        )}
                        {selectedTemplate.header_type && (
                          <div>
                            <p className="text-xs text-gray-500">Header Type</p>
                            <p className="text-gray-900">{selectedTemplate.header_type}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500">Created</p>
                          <p className="text-gray-900">{new Date(selectedTemplate.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Updated</p>
                          <p className="text-gray-900">{new Date(selectedTemplate.updated_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <DialogFooter className="mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedTemplate(null)}
                        >
                          Close
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => {
                            setTemplateToDelete(selectedTemplate);
                            setSelectedTemplate(null);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>

              {/* User Management Section (Admin only) */}
              {activeSection === 'users' && isAdmin && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h1>
                      <p className="text-gray-500 text-sm mt-1">
                        Manage user accounts and permissions
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchUsers}
                      disabled={loadingUsers}
                    >
                      <RefreshCw className={cn('w-4 h-4 mr-2', loadingUsers && 'animate-spin')} />
                      Refresh
                    </Button>
                  </div>

                  {/* Search & Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by email..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-9 h-10"
                      />
                    </div>
                    <Select value={userFilterTab} onValueChange={(value: UserFilterTab) => setUserFilterTab(value)}>
                      <SelectTrigger className="flex-1 sm:flex-none sm:w-[150px] h-10">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Role Pills */}
                  <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                    <button
                      onClick={() => setUserRoleFilter('all')}
                      className={cn(
                        'inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                        userRoleFilter === 'all'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <Users className={cn('w-3.5 h-3.5', userRoleFilter === 'all' ? 'text-white' : 'text-gray-500')} />
                      All ({userCounts.all})
                    </button>
                    <button
                      onClick={() => setUserRoleFilter('admin')}
                      className={cn(
                        'inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                        userRoleFilter === 'admin'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <Crown className={cn('w-3.5 h-3.5', userRoleFilter === 'admin' ? 'text-white' : 'text-purple-500')} />
                      Admin ({userCounts.admin})
                    </button>
                    <button
                      onClick={() => setUserRoleFilter('manager')}
                      className={cn(
                        'inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                        userRoleFilter === 'manager'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <Briefcase className={cn('w-3.5 h-3.5', userRoleFilter === 'manager' ? 'text-white' : 'text-blue-500')} />
                      Manager ({userCounts.manager})
                    </button>
                    <button
                      onClick={() => setUserRoleFilter('sdr')}
                      className={cn(
                        'inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                        userRoleFilter === 'sdr'
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <UserCog className={cn('w-3.5 h-3.5', userRoleFilter === 'sdr' ? 'text-white' : 'text-gray-500')} />
                      SDR ({userCounts.sdr})
                    </button>
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
                  ) : filteredUsers.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        {userSearchQuery ? (
                          <>
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500">No users match your search</p>
                            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                          </>
                        ) : (
                          <>
                            <Users className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500">
                              {users.length === 0 ? 'No users found' : 'No users match your filters'}
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filteredUsers.map((u) => (
                        <Card key={u.id}>
                          <CardContent className="py-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                                    u.is_active ? 'bg-green-100' : 'bg-gray-100'
                                  )}
                                >
                                  {u.is_active ? (
                                    <UserCheck className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <UserX className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 truncate">{u.email}</p>
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
                              <div className="flex items-center gap-2 flex-shrink-0">
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

              {/* Mobile Logout Section */}
              <div className="md:hidden mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="space-y-4">
                  {user && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Logged in as <span className="font-medium text-gray-900 dark:text-white">{user.email}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={logout}
                    className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Create Template Dialog */}
      <Dialog open={showCreateTemplate} onOpenChange={(open) => {
        setShowCreateTemplate(open);
        if (!open) resetTemplateForm();
      }}>
        <DialogContent className="w-[95vw] max-w-[700px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Create New Template</DialogTitle>
            <DialogDescription className="text-sm">
              Create a new WhatsApp message template.
              <span className="flex items-center gap-1 mt-1 text-blue-600">
                <Sparkles className="w-3 h-3" />
                Leave category/language empty for auto-detection
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 sm:py-4">
            {/* Template Name */}
            <div>
              <label className="text-sm font-medium">Template Name *</label>
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

            {/* Category and Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  Category
                  <span className="text-xs text-gray-400">(optional)</span>
                </label>
                <Select
                  value={newTemplate.category}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  Language
                  <span className="text-xs text-gray-400">(optional)</span>
                </label>
                <Select
                  value={newTemplate.language}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, language: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="es_MX">Spanish (Mexico)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="pt_BR">Portuguese (BR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Header Section */}
            <div className="border rounded-lg p-4 space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                Header
                <span className="text-xs text-gray-400">(optional)</span>
              </label>
              <Select
                value={newTemplate.header_type}
                onValueChange={(value) => setNewTemplate({
                  ...newTemplate,
                  header_type: value as HeaderType,
                  header_text: '',
                  header_handle: '',
                  header_media_url: ''
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No header" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">
                    <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Text</span>
                  </SelectItem>
                  <SelectItem value="IMAGE">
                    <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Image</span>
                  </SelectItem>
                  <SelectItem value="VIDEO">
                    <span className="flex items-center gap-2"><Video className="w-4 h-4" /> Video</span>
                  </SelectItem>
                  <SelectItem value="DOCUMENT">
                    <span className="flex items-center gap-2"><File className="w-4 h-4" /> Document</span>
                  </SelectItem>
                  <SelectItem value="LOCATION">
                    <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Text Header Input */}
              {newTemplate.header_type === 'TEXT' && (
                <div>
                  <Input
                    value={newTemplate.header_text}
                    onChange={(e) => setNewTemplate({ ...newTemplate, header_text: e.target.value })}
                    placeholder="Header text (e.g., Order {{order_id}} Update)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {'{{param_name}}'} for dynamic variables
                  </p>
                </div>
              )}

              {/* Media Header Upload */}
              {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(newTemplate.header_type) && (
                <div className="space-y-2">
                  {newTemplate.header_handle ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700 flex-1 truncate">{mediaFileName}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewTemplate({ ...newTemplate, header_handle: '', header_media_url: '' });
                          setMediaFileName('');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        id="media-upload"
                        className="hidden"
                        accept={
                          newTemplate.header_type === 'IMAGE' ? 'image/jpeg,image/png' :
                          newTemplate.header_type === 'VIDEO' ? 'video/mp4,video/3gpp' :
                          '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'
                        }
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleMediaUpload(file);
                        }}
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById('media-upload')?.click()}
                        disabled={uploadingMedia}
                      >
                        {uploadingMedia ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {uploadingMedia ? 'Uploading...' : `Upload ${newTemplate.header_type.toLowerCase()}`}
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {newTemplate.header_type === 'IMAGE' && 'JPEG or PNG, max 5MB'}
                    {newTemplate.header_type === 'VIDEO' && 'MP4 or 3GPP, max 16MB'}
                    {newTemplate.header_type === 'DOCUMENT' && 'PDF, Word, Excel, or PowerPoint, max 100MB'}
                  </p>
                </div>
              )}

              {newTemplate.header_type === 'LOCATION' && (
                <p className="text-xs text-gray-500">
                  Location will be provided when sending the template
                </p>
              )}
            </div>

            {/* Body Text */}
            <div>
              <label className="text-sm font-medium">Message Body *</label>
              <Textarea
                value={newTemplate.body_text}
                onChange={(e) => setNewTemplate({ ...newTemplate, body_text: e.target.value })}
                placeholder="Enter your message template..."
                className="mt-1 min-h-[100px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{{1}}'}, {'{{2}}'} for positional params or {'{{customer_name}}'} for named params
              </p>
            </div>

            {/* Parameter Examples - Show when body text has parameters */}
            {(() => {
              const params = (newTemplate.body_text.match(/\{\{(\w+)\}\}/g) || []).map(p => p.replace(/[{}]/g, ''));
              const uniqueParams = [...new Set(params)];
              if (uniqueParams.length === 0) return null;

              return (
                <div className="border rounded-lg p-3 sm:p-4 space-y-3 bg-blue-50/50">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <label className="text-sm font-medium text-blue-900">
                      Parameter Examples (Required)
                    </label>
                  </div>
                  <p className="text-xs text-blue-700">
                    Provide example values for each parameter.
                  </p>
                  <div className="space-y-2">
                    {uniqueParams.map((param) => (
                      <div key={param} className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <Badge variant="outline" className="w-fit sm:min-w-[80px] justify-center bg-white text-xs">
                          {'{{'}{param}{'}}'}
                        </Badge>
                        <Input
                          value={newTemplate.parameter_examples[param] || ''}
                          onChange={(e) => setNewTemplate({
                            ...newTemplate,
                            parameter_examples: {
                              ...newTemplate.parameter_examples,
                              [param]: e.target.value
                            }
                          })}
                          placeholder={`Example ${param}`}
                          className="flex-1 h-8 bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                Footer
                <span className="text-xs text-gray-400">(optional)</span>
              </label>
              <Input
                value={newTemplate.footer_text}
                onChange={(e) => setNewTemplate({ ...newTemplate, footer_text: e.target.value })}
                placeholder="e.g., Reply STOP to unsubscribe"
                className="mt-1"
              />
            </div>

            {/* Buttons Section */}
            <div className="border rounded-lg p-3 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="text-sm font-medium">
                  Buttons
                  <span className="text-xs text-gray-400 ml-1">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addButton('QUICK_REPLY')}
                    disabled={newTemplate.buttons.filter(b => b.type === 'QUICK_REPLY').length >= 10}
                  >
                    <Plus className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline">Quick Reply</span>
                    <span className="sm:hidden">Reply</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addButton('URL')}
                    disabled={newTemplate.buttons.filter(b => b.type === 'URL').length >= 2}
                  >
                    <Link className="w-3 h-3 sm:mr-1" />
                    <span>URL</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addButton('PHONE_NUMBER')}
                    disabled={newTemplate.buttons.filter(b => b.type === 'PHONE_NUMBER').length >= 1}
                  >
                    <Phone className="w-3 h-3 sm:mr-1" />
                    <span>Call</span>
                  </Button>
                </div>
              </div>

              {newTemplate.buttons.length > 0 && (
                <div className="space-y-2">
                  {newTemplate.buttons.map((button, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {button.type === 'QUICK_REPLY' ? 'Reply' : button.type === 'URL' ? 'URL' : 'Call'}
                        </Badge>
                        <Input
                          value={button.text || ''}
                          onChange={(e) => updateButton(index, 'text', e.target.value)}
                          placeholder="Button text"
                          className="flex-1 h-8"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeButton(index)}
                          className="sm:hidden flex-shrink-0"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      {button.type === 'URL' && (
                        <Input
                          value={button.url || ''}
                          onChange={(e) => updateButton(index, 'url', e.target.value)}
                          placeholder="https://example.com"
                          className="flex-1 h-8"
                        />
                      )}
                      {button.type === 'PHONE_NUMBER' && (
                        <Input
                          value={button.phone_number || ''}
                          onChange={(e) => updateButton(index, 'phone_number', e.target.value)}
                          placeholder="+15551234567"
                          className="flex-1 h-8"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeButton(index)}
                        className="hidden sm:flex flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {newTemplate.buttons.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  No buttons added. Click above to add interactive buttons.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateTemplate(false);
              resetTemplateForm();
            }}>
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
            <AlertDialogTitle>
              {templateToDelete?.status === 'DELETED' ? 'Permanently Delete Template' : 'Delete Template'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {templateToDelete?.status === 'DELETED' ? (
                <>
                  Are you sure you want to <strong>permanently delete</strong> the template &quot;{templateToDelete?.name}&quot;?
                  This will remove it from the database completely and cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete the template &quot;{templateToDelete?.name}&quot;?
                  It will be moved to the Deleted tab where you can permanently delete it later.
                </>
              )}
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
              {templateToDelete?.status === 'DELETED' ? 'Delete Permanently' : 'Delete'}
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

// Default export with Suspense wrapper for useSearchParams
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <SettingsPageContent />
    </Suspense>
  );
}
