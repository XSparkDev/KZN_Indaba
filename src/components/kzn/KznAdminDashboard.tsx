import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, Download, RefreshCw, Search, X, XCircle } from 'lucide-react';
import { kznSupabase } from '../../lib/kznSupabase';
import { QrScanner } from '../QrScanner';

type KznRegistrant = {
  id: string;
  reference: string | null;
  xs_user_id: string | null;
  is_email_verified: boolean;
  first_name: string;
  last_name: string;
  email: string;
  organisation: string | null;
  phone_number: string | null;
  delegate_category: string | null;
  district: string | null;
  day_one: boolean | null;
  day_two: boolean | null;
  gala_dinner: string | null;
  shuttle: string | null;
  accommodation: string | null;
  created_at: string | null;
  registration_complete: boolean | null;
  status?: 'Registered' | 'Confirmed';
  emailVerified?: boolean;
  photoConsent?: boolean;
  headshotPath?: string | null;
  headshotMime?: string | null;
};

type ListAttendeesResponse = {
  ok?: boolean;
  attendees?: Array<{
    id: string | number;
    xsUserId?: string;
    email?: string;
    status?: 'Registered' | 'Confirmed';
    emailVerified?: boolean;
    photoConsent?: boolean;
    headshotPath?: string | null;
    headshotMime?: string | null;
  }>;
};

type KznAdminDashboardProps = {
  onBack: () => void;
  onRegisterMember: () => void;
};

const formatRegisteredDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formattedDate} · ${formattedTime}`;
};

const yesNo = (value?: boolean | null) => (value ? 'Yes' : 'No');

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

export default function KznAdminDashboard({ onBack, onRegisterMember }: KznAdminDashboardProps) {
  const [registrants, setRegistrants] = useState<KznRegistrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const [scanToast, setScanToast] = useState<{
    tone: 'success' | 'warning' | 'error';
    title: string;
    body: string;
  } | null>(null);

  const [openActionForId, setOpenActionForId] = useState<string | null>(null);
  const [previewRegistrant, setPreviewRegistrant] = useState<KznRegistrant | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    title: string;
    body: string;
  } | null>(null);

  const conferenceCode =
    (import.meta as any).env?.VITE_CONFERENCE_CODE ||
    (import.meta as any).env?.CONFERENCE_CODE ||
    (typeof process !== 'undefined' ? (process as any).env?.CONFERENCE_CODE : '');

  // Use the same Supabase Functions base URL as the Jogeda clone.
  // This avoids 404/CORS when KZN Edge Functions are not deployed yet.
  const supabaseFunctionsBaseUrl =
    (import.meta as any).env?.VITE_SUPABASE_FUNCTIONS_URL ||
    (typeof process !== 'undefined' ? (process as any).env?.VITE_SUPABASE_FUNCTIONS_URL : '') ||
    '';

  const supabaseAnonKey =
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined' ? (process as any).env?.VITE_SUPABASE_ANON_KEY : '') ||
    '';

  const kznSupabaseUrl =
    (import.meta as any).env?.VITE_KZN_SUPABASE_URL ||
    (typeof process !== 'undefined' ? (process as any).env?.VITE_KZN_SUPABASE_URL : '') ||
    '';

  const kznSupabaseAnonKey =
    (import.meta as any).env?.VITE_KZN_SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined' ? (process as any).env?.VITE_KZN_SUPABASE_ANON_KEY : '') ||
    '';

  const effectiveFunctionsBaseUrl =
    supabaseFunctionsBaseUrl || (kznSupabaseUrl ? `${kznSupabaseUrl.replace(/\/+$/, '')}/functions/v1` : '');

  const effectiveAnonKey = supabaseAnonKey || kznSupabaseAnonKey;

  const fetchRegistrants = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!kznSupabase) {
        throw new Error('KZN Supabase client is not configured.');
      }
      const { data, error: fetchError } = await kznSupabase
        .from('kzn_indaba_registrants')
        .select(
          'id, reference, xs_user_id, is_email_verified, first_name, last_name, email, organisation, phone_number, delegate_category, district, day_one, day_two, gala_dinner, shuttle, accommodation, created_at, registration_complete',
        )
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to load KZN registrants.');
      }

      const loaded = (data ?? []) as KznRegistrant[];

      // Pull emailVerified/status/headshot info from the Jogeda-style list-attendees endpoint (if available).
      if (effectiveFunctionsBaseUrl && conferenceCode) {
        try {
          const url = new URL(`${effectiveFunctionsBaseUrl}/list-attendees`);
          url.searchParams.set('conferenceCode', conferenceCode);
          const res = await fetch(url.toString(), {
            headers: {
              ...(effectiveAnonKey
                ? {
                    apikey: effectiveAnonKey,
                    Authorization: `Bearer ${effectiveAnonKey}`,
                  }
                : {}),
            },
          });
          const body = (await res.json().catch(() => ({}))) as ListAttendeesResponse;
          const attendees = (body.attendees ?? []) as NonNullable<ListAttendeesResponse['attendees']>;
          const byXsUserId = new Map<string, (typeof attendees)[number]>();
          const byEmail = new Map<string, (typeof attendees)[number]>();
          attendees.forEach((a) => {
            if (a.xsUserId) byXsUserId.set(String(a.xsUserId).toLowerCase(), a);
            if (a.email) byEmail.set(String(a.email).toLowerCase(), a);
          });

          loaded.forEach((r) => {
            const xsKey = (r.xs_user_id || '').toLowerCase();
            const emailKey = (r.email || '').toLowerCase();
            const match = (xsKey && byXsUserId.get(xsKey)) || (emailKey && byEmail.get(emailKey));
            if (match) {
              r.status = match.status ?? r.status;
              r.emailVerified = Boolean(match.emailVerified);
              if (r.emailVerified === true) {
                r.is_email_verified = true;
              }
              r.photoConsent = Boolean(match.photoConsent);
              r.headshotPath = match.headshotPath ?? null;
              r.headshotMime = match.headshotMime ?? null;
            }
          });
        } catch {
          // Non-fatal: dashboard still works without these extras.
        }
      }

      setRegistrants(loaded);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unexpected error while loading KZN registrants.';
      setError(message);
      setRegistrants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRegistrants();
  }, []);

  useEffect(() => {
    const handleOutsideActionClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-action-menu-container="true"]')) return;
      setOpenActionForId(null);
    };

    document.addEventListener('mousedown', handleOutsideActionClick);
    return () => document.removeEventListener('mousedown', handleOutsideActionClick);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!scanToast) return;
    const id = window.setTimeout(() => setScanToast(null), 3600);
    return () => window.clearTimeout(id);
  }, [scanToast]);

  useEffect(() => {
    if (!scannerOpen) {
      setScanProcessing(false);
      lastScanRef.current = null;
    }
  }, [scannerOpen]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const filteredRegistrants = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return registrants;
    return registrants.filter((r) => {
      const fullName = `${r.first_name || ''} ${r.last_name || ''}`.trim().toLowerCase();
      const email = (r.email || '').toLowerCase();
      const organisation = (r.organisation || '').toLowerCase();
      return (
        fullName.includes(term) || email.includes(term) || organisation.includes(term)
      );
    });
  }, [registrants, search]);

  const extractUserIdFromScan = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return '';
    try {
      const looksLikeUrl = /^https?:\/\//i.test(cleaned) || /^www\./i.test(cleaned);
      if (!looksLikeUrl) return cleaned;
      const normalized = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
      const urlObj = new URL(normalized);
      return (
        (urlObj.searchParams.get('userId') ||
          urlObj.searchParams.get('uid') ||
          urlObj.searchParams.get('xsUserId') ||
          '') as string
      ).trim();
    } catch {
      return cleaned;
    }
  };

  const openPreview = (registrant: KznRegistrant) => {
    setPreviewRegistrant(registrant);
    setShowPreviewModal(true);
  };

  const verifyEmail = async (registrant: KznRegistrant) => {
    try {
      if (!effectiveFunctionsBaseUrl) {
        setToast({
          type: 'error',
          title: 'Config Error',
          body: 'Supabase functions URL is not configured.',
        });
        return;
      }

      if (!conferenceCode) {
        setToast({
          type: 'error',
          title: 'Config Error',
          body: 'Conference code is not configured.',
        });
        return;
      }

      if (!registrant.email) {
        setToast({
          type: 'error',
          title: 'Missing Registrant Data',
          body: 'This registrant is missing an email address.',
        });
        return;
      }

      const verifyRes = await fetch(`${effectiveFunctionsBaseUrl}/mark-email-verified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(effectiveAnonKey
            ? {
                apikey: effectiveAnonKey,
                Authorization: `Bearer ${effectiveAnonKey}`,
              }
            : {}),
        },
        body: JSON.stringify({
          email: registrant.email,
          conferenceCode,
        }),
      });

      const verifyData = await verifyRes.json().catch(() => ({} as any));
      const verifySuccess = Boolean((verifyData as any).success);
      if (!verifyRes.ok || !verifySuccess) {
        setToast({
          type: 'error',
          title: 'Verify Failed',
          body:
            (verifyData && ((verifyData as any).message as string | undefined)) ||
            (verifyRes.ok ? 'Email could not be marked as verified.' : 'Verify request failed.'),
        });
        return;
      }

      if (kznSupabase) {
        const { error: persistErrorById } = await kznSupabase
          .from('kzn_indaba_registrants')
          .update({ is_email_verified: true })
          .eq('id', registrant.id);

        if (persistErrorById) {
          setToast({
            type: 'error',
            title: 'Persist Failed',
            body:
              persistErrorById.message ||
              'Email was verified upstream, but we could not update is_email_verified.',
          });
          return;
        }

        // Confirm persisted state by reading the row. This is more reliable than
        // relying on update-returned rows across different PostgREST settings.
        const { data: persistedById, error: verifyPersistError } = await kznSupabase
          .from('kzn_indaba_registrants')
          .select('id, is_email_verified')
          .eq('id', registrant.id)
          .maybeSingle();

        if (verifyPersistError) {
          setToast({
            type: 'error',
            title: 'Persist Failed',
            body:
              verifyPersistError.message ||
              'Email was verified upstream, but we could not confirm is_email_verified.',
          });
          return;
        }

        if (!persistedById || persistedById.is_email_verified !== true) {
          const { data: persistedByEmail, error: verifyByEmailError } = await kznSupabase
            .from('kzn_indaba_registrants')
            .select('id, is_email_verified')
            .ilike('email', registrant.email)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (verifyByEmailError) {
            setToast({
              type: 'error',
              title: 'Persist Failed',
              body:
                verifyByEmailError.message ||
                'Email was verified upstream, but we could not confirm is_email_verified.',
            });
            return;
          }

          if (!persistedByEmail || persistedByEmail.is_email_verified !== true) {
            setToast({
              type: 'error',
              title: 'Persist Failed',
              body:
                'Email was verified upstream, but is_email_verified is still false. Check RLS/update policies for kzn_indaba_registrants.',
            });
            return;
          }
        }
      }

      setToast({
        type: 'success',
        title: 'Email Verified',
        body: 'Delegate email has been marked as verified.',
      });
      setRegistrants((prev) =>
        prev.map((r) =>
          r.id === registrant.id
            ? { ...r, is_email_verified: true, emailVerified: true }
            : r,
        ),
      );
      await fetchRegistrants();
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Network Error',
        body: err instanceof Error ? err.message : 'Could not verify this registrant.',
      });
    }
  };

  const checkInRegistrant = async (registrant: KznRegistrant) => {
    try {
      if (!effectiveFunctionsBaseUrl) {
        setToast({
          type: 'error',
          title: 'Config Error',
          body: 'Supabase functions URL is not configured.',
        });
        return;
      }

      if (!conferenceCode) {
        setToast({
          type: 'error',
          title: 'Config Error',
          body: 'Conference code is not configured.',
        });
        return;
      }

      if (!registrant.xs_user_id) {
        setToast({
          type: 'error',
          title: 'Missing Registrant Data',
          body: 'This registrant is missing an XS userId.',
        });
        return;
      }

      const callCheckIn = async () =>
        fetch(`${effectiveFunctionsBaseUrl}/checkin-attendee`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(effectiveAnonKey
              ? {
                  apikey: effectiveAnonKey,
                  Authorization: `Bearer ${effectiveAnonKey}`,
                }
              : {}),
          },
          body: JSON.stringify({
            uid: registrant.xs_user_id,
            email: registrant.email,
            conferenceCode,
          }),
        });

      const mirrorToRegistrations = async () => {
        const mirrorRes = await fetch(`${effectiveFunctionsBaseUrl}/mirror-registration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(effectiveAnonKey
              ? {
                  apikey: effectiveAnonKey,
                  Authorization: `Bearer ${effectiveAnonKey}`,
                }
              : {}),
          },
          body: JSON.stringify({
            xsPayload: {},
            extended: {
              conferenceCode,
              firstName: registrant.first_name || 'Unknown',
              lastName: registrant.last_name || 'Unknown',
              email: registrant.email,
              organisation: registrant.organisation || '',
              phone: registrant.phone_number || '',
              photoConsent: false,
              xsUserId: registrant.xs_user_id,
            },
          }),
        });
        return mirrorRes.ok;
      };

      let res = await callCheckIn();
      let data = await res.json().catch(() => ({} as any));

      if (!res.ok && (data as any).reason === 'registration_not_found') {
        const mirrored = await mirrorToRegistrations();
        if (mirrored) {
          if (registrant.is_email_verified === true && registrant.email) {
            await fetch(`${effectiveFunctionsBaseUrl}/mark-email-verified`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(effectiveAnonKey
                  ? {
                      apikey: effectiveAnonKey,
                      Authorization: `Bearer ${effectiveAnonKey}`,
                    }
                  : {}),
              },
              body: JSON.stringify({
                email: registrant.email,
                conferenceCode,
              }),
            }).catch(() => null);
          }
          res = await callCheckIn();
          data = await res.json().catch(() => ({} as any));
        }
      }

      if (!res.ok && (data as any).reason === 'email_not_verified' && registrant.email) {
        await fetch(`${effectiveFunctionsBaseUrl}/mark-email-verified`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(effectiveAnonKey
              ? {
                  apikey: effectiveAnonKey,
                  Authorization: `Bearer ${effectiveAnonKey}`,
                }
              : {}),
          },
          body: JSON.stringify({
            email: registrant.email,
            conferenceCode,
          }),
        }).catch(() => null);

        res = await callCheckIn();
        data = await res.json().catch(() => ({} as any));
      }

      if (!res.ok) {
        const reason = (data as any).reason as string | undefined;
        const message =
          (data && ((data as any).message as string | undefined)) || 'Check-in failed. Please try again.';
        setToast({
          type: 'error',
          title:
            reason === 'not_registered'
              ? 'Not Registered'
              : reason === 'not_allowed'
                ? 'Not Allowed'
                : reason === 'email_not_verified'
                  ? 'Email Not Verified'
                  : 'Check-in Error',
          body: message,
        });
        return;
      }

      setToast({
        type: 'success',
        title: 'Checked In',
        body: (data && ((data as any).message as string | undefined)) || 'Delegate checked in successfully.',
      });
      await fetchRegistrants();
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Network Error',
        body: err instanceof Error ? err.message : 'Could not check in this registrant.',
      });
    }
  };

  const openHeadshotPreview = async (registrant: KznRegistrant) => {
    setPreviewRegistrant(registrant);
    setShowPreviewModal(true);

    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      setPreviewImageUrl(null);
    }

    if (!registrant.photoConsent || !registrant.headshotPath) {
      return;
    }

    if (!effectiveFunctionsBaseUrl || !conferenceCode) {
      return;
    }

    setPreviewLoading(true);
    try {
      const url = new URL(`${effectiveFunctionsBaseUrl}/preview-headshot`);
      url.searchParams.set('id', registrant.id);
      url.searchParams.set('conferenceCode', conferenceCode);

      const res = await fetch(url.toString(), {
        headers: {
          ...(effectiveAnonKey
            ? {
                apikey: effectiveAnonKey,
                Authorization: `Bearer ${effectiveAnonKey}`,
              }
            : {}),
        },
      });

      if (!res.ok) {
        setToast({
          type: 'error',
          title: 'Preview Failed',
          body: 'We could not load the headshot preview. Please try again.',
        });
        return;
      }

      const blob = await res.blob();
      const newUrl = URL.createObjectURL(blob);
      setPreviewImageUrl(newUrl);
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Preview Failed',
        body: err instanceof Error ? err.message : 'We could not load the headshot preview.',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadCsv = () => {
    const headers = [
      'Reference',
      'Name',
      'Email',
      'Organisation',
      'Phone Number',
      'Delegate Category',
      'District',
      'Day 1',
      'Day 2',
      'Gala Dinner',
      'Shuttle',
      'Accommodation',
      'Registered At',
      'Complete',
    ];

    const rows = filteredRegistrants.map((r) => [
      r.reference || '',
      `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      r.email || '',
      r.organisation || '',
      r.phone_number || '',
      r.delegate_category || '',
      r.district || '',
      yesNo(r.day_one),
      yesNo(r.day_two),
      r.gala_dinner || '',
      r.shuttle || '',
      r.accommodation || '',
      formatRegisteredDate(r.created_at),
      r.registration_complete ? 'Yes' : 'No',
    ]);

    const csvBody = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(String(cell))).join(','))
      .join('\n');

    const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kzn-indaba-registrants.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#102e5d] flex items-start justify-center px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 md:p-10 font-sans">
      <div className="w-full max-w-[96rem] bg-white rounded-[1.5rem] shadow-2xl border border-[#173a70] p-4 sm:p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#102e5d] border border-[#102e5d] px-3 py-2 rounded-md hover:bg-[#102e5d] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#CC0000] mb-2">
              Internal Tool
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-black uppercase text-[#102e5d]">
              KZN Indaba Registrants
            </h1>
            <p className="text-xs text-[#6b7280] mt-2 max-w-xl">
              View and export KZN Liquor Indaba registrations from the KZN Supabase project.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={downloadCsv}
              className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#CC0000] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-[#990000] transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            type="button"
            onClick={() => void fetchRegistrants()}
            className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#6b7280] hover:border-[#102e5d] hover:text-[#102e5d] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh List
          </button>
          <button
            type="button"
            onClick={() => {
              setScanToast(null);
              setScanProcessing(false);
              setScannerOpen(true);
            }}
            className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-[#102e5d] transition-colors"
          >
            <Camera className="w-4 h-4" />
            Open Scanner
          </button>
        </div>

        <div className="mb-6 flex justify-center">
          <button
            type="button"
            onClick={onRegisterMember}
            className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#97bf0d] px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#1a1a1a] hover:bg-[#86aa0b] transition-colors"
          >
            Register a member
          </button>
        </div>

        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#173a70]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="w-full pl-9 pr-3 py-2 rounded-md border border-[#102e5d] bg-white text-sm font-medium text-[#102e5d] outline-none focus:border-[#173a70] transition-colors"
            />
          </div>
          <p className="text-[11px] text-[#6b7280] font-medium">
            Showing <span className="font-bold text-[#102e5d]">{filteredRegistrants.length}</span>{' '}
            of <span className="font-bold text-[#102e5d]">{registrants.length}</span> registrants
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-[#dc2626] font-medium">
            {error}
          </div>
        )}

        {toast && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-xs font-medium ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <p className="font-bold">{toast.title}</p>
            <p className="mt-1">{toast.body}</p>
          </div>
        )}

        <div className="md:hidden mb-2 px-1">
          <div className="flex items-center gap-2 rounded-xl border border-[#173a70]/20 bg-white/90 px-3 py-2 text-[11px] text-[#6b7280] shadow-sm">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#102e5d]/10 text-[#102e5d] font-black scroll-hint-arrow">
              ←
            </span>
            <span className="font-medium">Scroll left to see more columns</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#173a70]/20">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#102e5d] border-b border-[#173a70]">
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                <th className="px-4 py-3 min-w-[170px]">Reference</th>
                <th className="px-4 py-3 min-w-[180px]">Name</th>
                <th className="px-4 py-3 min-w-[220px]">Email</th>
                <th className="px-4 py-3 min-w-[180px]">Organisation</th>
                <th className="px-4 py-3 min-w-[140px]">Phone Number</th>
                <th className="px-4 py-3 min-w-[180px]">Delegate Category</th>
                <th className="px-4 py-3 min-w-[160px]">District</th>
                <th className="px-4 py-3 min-w-[80px]">Day 1</th>
                <th className="px-4 py-3 min-w-[80px]">Day 2</th>
                <th className="px-4 py-3 min-w-[130px]">Gala Dinner</th>
                <th className="px-4 py-3 min-w-[100px]">Shuttle</th>
                <th className="px-4 py-3 min-w-[130px]">Accommodation</th>
                <th className="px-4 py-3 min-w-[180px]">Registered At</th>
                <th className="px-4 py-3 min-w-[90px] text-center">Complete</th>
                <th className="px-4 py-3 min-w-[110px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-xs text-[#6b7280]">
                    Loading registrants...
                  </td>
                </tr>
              ) : filteredRegistrants.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-xs text-[#6b7280]">
                    No registrants found.
                  </td>
                </tr>
              ) : (
                filteredRegistrants.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 odd:bg-white even:bg-slate-50 hover:bg-[#F5F0E8] transition-colors"
                  >
                    <td className="px-4 py-3 text-[11px] font-semibold text-[#102e5d] whitespace-nowrap">
                      {r.reference || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#102e5d] break-words">
                      {`${r.first_name || ''} ${r.last_name || ''}`.trim() || '-'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#102e5d] break-all">{r.email || '-'}</td>
                    <td className="px-4 py-3 text-[11px] text-[#102e5d] break-all">{r.organisation || '-'}</td>
                    <td className="px-4 py-3 text-[11px] text-[#102e5d] whitespace-nowrap">{r.phone_number || '-'}</td>
                    <td className="px-4 py-3 text-[11px] text-[#102e5d] break-words">{r.delegate_category || '-'}</td>
                    <td className="px-4 py-3 text-[11px] text-[#102e5d] break-words">{r.district || '-'}</td>
                    <td className="px-4 py-3 text-[11px] text-[#102e5d]">{yesNo(r.day_one)}</td>
                    <td className="px-4 py-3 text-[11px] text-[#102e5d]">{yesNo(r.day_two)}</td>
                    <td className="px-4 py-3 text-[11px] text-[#102e5d]">{r.gala_dinner || '-'}</td>
                    <td className="px-4 py-3 text-[11px] text-[#102e5d]">{r.shuttle || '-'}</td>
                    <td className="px-4 py-3 text-[11px] text-[#102e5d]">{r.accommodation || '-'}</td>
                    <td className="px-4 py-3 text-[11px] text-[#6b7280]">{formatRegisteredDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-center">
                      {r.status === 'Confirmed' ? (
                        <span className="inline-flex items-center justify-center rounded-lg bg-[#16a34a]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#15803d]">
                          Confirmed
                        </span>
                      ) : r.registration_complete ? (
                        <CheckCircle2 className="w-5 h-5 text-[#16a34a] mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#dc2626] mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-right">
                      <div className="relative inline-flex justify-end" data-action-menu-container="true">
                        <button
                          type="button"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white/80 hover:bg-zinc-50 transition-colors"
                          onClick={() => setOpenActionForId((prev) => (prev === r.id ? null : r.id))}
                          aria-label="Open actions"
                        >
                          ⋯
                        </button>

                        {openActionForId === r.id && (
                          <div className="absolute right-0 mt-2 w-44 rounded-xl border border-zinc-200 bg-white shadow-lg z-20 overflow-hidden">
                            <button
                              type="button"
                              disabled={
                                !r.xs_user_id ||
                                r.status === 'Confirmed' ||
                                r.is_email_verified !== true
                              }
                              className={`w-full px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.16em] transition-colors ${
                                !r.xs_user_id ||
                                r.status === 'Confirmed' ||
                                r.is_email_verified !== true
                                  ? 'text-zinc-400 cursor-default bg-zinc-50'
                                  : 'text-[#102e5d] hover:bg-[#102e5d]/10 bg-white'
                              }`}
                              onClick={() => {
                                setOpenActionForId(null);
                                void checkInRegistrant(r);
                              }}
                            >
                              {r.status === 'Confirmed'
                                ? 'Checked In'
                                : r.is_email_verified !== true
                                  ? 'Not Verified'
                                  : 'Check In'}
                            </button>
                            <div className="w-full px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.16em] border-t border-zinc-100 text-amber-600 bg-white">
                              {r.registration_complete ? 'Verified' : 'Not verified'}
                            </div>
                            <button
                              type="button"
                              disabled={!r.email || r.is_email_verified === true}
                              className={`w-full px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.16em] transition-colors border-t border-zinc-100 ${
                                !r.email || r.is_email_verified === true
                                  ? 'text-zinc-400 cursor-default bg-zinc-50'
                                  : 'text-[#102e5d] hover:bg-[#102e5d]/10 bg-white'
                              }`}
                              onClick={() => {
                                setOpenActionForId(null);
                                void verifyEmail(r);
                              }}
                            >
                              Verify Email
                            </button>
                            <button
                              type="button"
                              disabled={previewLoading}
                              className={`w-full px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.16em] transition-colors border-t border-zinc-100 ${
                                previewLoading
                                  ? 'text-zinc-400 cursor-default bg-zinc-50'
                                  : 'text-[#102e5d] hover:bg-[#102e5d]/10 bg-white'
                              }`}
                              onClick={() => {
                                setOpenActionForId(null);
                                void openHeadshotPreview(r);
                              }}
                            >
                              {previewLoading ? 'Loading...' : 'Preview'}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {scannerOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-zinc-100 relative">
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:text-[#102e5d] hover:border-[#102e5d] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#CC0000]">
                  Scanner
                </p>
                <h2 className="mt-1 text-2xl font-display font-black uppercase text-[#102e5d]">
                  Scan Registrant QR
                </h2>
                <p className="mt-2 text-xs text-[#6b7280]">
                  Scan a registrant QR code to quickly locate them in the list.
                </p>
              </div>
              <QrScanner
                onResult={(value) => {
                  if (scanProcessing) return;
                  const cleaned = value.trim();
                  if (!cleaned) return;
                  const now = Date.now();
                  if (
                    lastScanRef.current &&
                    lastScanRef.current.value === cleaned &&
                    now - lastScanRef.current.at < 3000
                  ) {
                    return;
                  }
                  lastScanRef.current = { value: cleaned, at: now };

                  (async () => {
                    try {
                      setScanProcessing(true);
                      if (!effectiveFunctionsBaseUrl) {
                        setScanToast({
                          tone: 'error',
                          title: 'Config Error',
                          body: 'Supabase functions URL is not configured.',
                        });
                        return;
                      }

                      if (!conferenceCode) {
                        setScanToast({
                          tone: 'error',
                          title: 'Config Error',
                          body: 'Conference code is not configured.',
                        });
                        return;
                      }

                      const userId = extractUserIdFromScan(cleaned);
                      const matchedRegistrant =
                        registrants.find((r) => (r.xs_user_id || '').trim() === userId) || null;

                      if (!userId) {
                        setScanToast({
                          tone: 'error',
                          title: 'Registrant Not Found',
                          body: 'QR code is not registered',
                        });
                        return;
                      }

                      const callScanCheckIn = async () =>
                        fetch(`${effectiveFunctionsBaseUrl}/checkin-attendee`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(effectiveAnonKey
                              ? {
                                  apikey: effectiveAnonKey,
                                  Authorization: `Bearer ${effectiveAnonKey}`,
                                }
                              : {}),
                          },
                          body: JSON.stringify({
                            uid: userId,
                            email: matchedRegistrant?.email || undefined,
                            conferenceCode,
                          }),
                        });

                      const mirrorFromMatchedRegistrant = async () => {
                        if (!matchedRegistrant) return false;
                        const mirrorRes = await fetch(`${effectiveFunctionsBaseUrl}/mirror-registration`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(effectiveAnonKey
                              ? {
                                  apikey: effectiveAnonKey,
                                  Authorization: `Bearer ${effectiveAnonKey}`,
                                }
                              : {}),
                          },
                          body: JSON.stringify({
                            xsPayload: {},
                            extended: {
                              conferenceCode,
                              firstName: matchedRegistrant.first_name || 'Unknown',
                              lastName: matchedRegistrant.last_name || 'Unknown',
                              email: matchedRegistrant.email,
                              organisation: matchedRegistrant.organisation || '',
                              phone: matchedRegistrant.phone_number || '',
                              photoConsent: false,
                              xsUserId: matchedRegistrant.xs_user_id,
                            },
                          }),
                        });
                        return mirrorRes.ok;
                      };

                      let res = await callScanCheckIn();
                      let data = await res.json().catch(() => ({} as any));

                      if (!res.ok && (data as any).reason === 'registration_not_found') {
                        const mirrored = await mirrorFromMatchedRegistrant();
                        if (mirrored) {
                          if (
                            matchedRegistrant &&
                            matchedRegistrant.is_email_verified === true &&
                            matchedRegistrant.email
                          ) {
                            await fetch(`${effectiveFunctionsBaseUrl}/mark-email-verified`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(effectiveAnonKey
                                  ? {
                                      apikey: effectiveAnonKey,
                                      Authorization: `Bearer ${effectiveAnonKey}`,
                                    }
                                  : {}),
                              },
                              body: JSON.stringify({
                                email: matchedRegistrant.email,
                                conferenceCode,
                              }),
                            }).catch(() => null);
                          }
                          res = await callScanCheckIn();
                          data = await res.json().catch(() => ({} as any));
                        }
                      }

                      if (
                        !res.ok &&
                        (data as any).reason === 'email_not_verified' &&
                        matchedRegistrant?.email
                      ) {
                        await fetch(`${effectiveFunctionsBaseUrl}/mark-email-verified`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(effectiveAnonKey
                              ? {
                                  apikey: effectiveAnonKey,
                                  Authorization: `Bearer ${effectiveAnonKey}`,
                                }
                              : {}),
                          },
                          body: JSON.stringify({
                            email: matchedRegistrant.email,
                            conferenceCode,
                          }),
                        }).catch(() => null);

                        res = await callScanCheckIn();
                        data = await res.json().catch(() => ({} as any));
                      }

                      if (!res.ok) {
                        const reason = (data as any).reason as string | undefined;

                        if (reason === 'email_not_verified') {
                          setScanToast({
                            tone: 'warning',
                            title: 'Not Verified',
                            body: 'Delegate email is not verified yet',
                          });
                          return;
                        }

                        if (reason === 'not_registered' || reason === 'registration_not_found') {
                          setScanToast({
                            tone: 'error',
                            title: 'Registrant Not Found',
                            body: 'QR code is not registered',
                          });
                          return;
                        }

                        setScanToast({
                          tone: 'error',
                          title: 'Check-in Error',
                          body: (data && ((data as any).message as string | undefined)) || 'Check-in failed.',
                        });
                        return;
                      }

                      setScanToast({
                        tone: 'success',
                        title: 'Checked In',
                        body: (data && ((data as any).message as string | undefined)) || 'Check-in complete.',
                      });
                      await fetchRegistrants();
                    } finally {
                      window.setTimeout(() => setScanProcessing(false), 800);
                    }
                  })();
                }}
                onError={(message) => {
                  setScanToast({
                    tone: 'error',
                    title: 'Camera Error',
                    body: message,
                  });
                }}
              />

              {scanToast && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-xs font-medium ${
                    scanToast.tone === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : scanToast.tone === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  <p className="font-bold">{scanToast.title}</p>
                  <p className="mt-1">{scanToast.body}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {showPreviewModal && previewRegistrant && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-zinc-100 relative">
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewRegistrant(null);
                }}
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:text-[#102e5d] hover:border-[#102e5d] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#CC0000]">
                  Preview
                </p>
                <h2 className="mt-1 text-2xl font-display font-black uppercase text-[#102e5d]">
                  Registrant Details
                </h2>
              </div>

              <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</p>
                <p className="mt-1 text-sm text-zinc-700">
                  {previewRegistrant.status === 'Confirmed' ? 'Confirmed (Checked In)' : 'Registered'}
                </p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Email Verified</p>
                <p className="mt-1 text-sm text-zinc-700">
                  {previewRegistrant.is_email_verified === true ? 'Yes' : 'No'}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl border border-zinc-200 p-4 bg-zinc-50">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Reference</p>
                  <p className="mt-1 font-semibold text-[#102e5d] break-all">{previewRegistrant.reference || '—'}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4 bg-zinc-50">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</p>
                  <p className="mt-1 font-semibold text-[#102e5d]">
                    {previewRegistrant.registration_complete ? 'Verified / Complete' : 'Not verified'}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Name</p>
                  <p className="mt-1 text-zinc-700">
                    {`${previewRegistrant.first_name || ''} ${previewRegistrant.last_name || ''}`.trim() || '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Email</p>
                  <p className="mt-1 text-zinc-700 break-all">{previewRegistrant.email || '—'}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Organisation</p>
                  <p className="mt-1 text-zinc-700 break-words">{previewRegistrant.organisation || '—'}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Phone</p>
                  <p className="mt-1 text-zinc-700 break-words">{previewRegistrant.phone_number || '—'}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Registered</p>
                  <p className="mt-1 text-zinc-700">{formatRegisteredDate(previewRegistrant.created_at)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Attendance</p>
                  <p className="mt-1 text-zinc-700">
                    Day 1: {yesNo(previewRegistrant.day_one)} · Day 2: {yesNo(previewRegistrant.day_two)}
                  </p>
                  <p className="mt-1 text-zinc-700">
                    Gala: {previewRegistrant.gala_dinner || '—'} · Shuttle: {previewRegistrant.shuttle || '—'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 justify-end">
                <button
                  type="button"
                  disabled={
                    !previewRegistrant.email ||
                    previewRegistrant.is_email_verified === true
                  }
                  onClick={() => void verifyEmail(previewRegistrant)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#102e5d] px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-[#0e1f3d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Verify Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewRegistrant(null);
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-600 hover:border-[#102e5d] hover:text-[#102e5d] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
