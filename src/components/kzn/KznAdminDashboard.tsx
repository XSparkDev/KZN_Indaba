import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, Search, XCircle } from 'lucide-react';
import { kznSupabase } from '../../lib/kznSupabase';

type KznRegistrant = {
  id: string;
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
};

type KznAdminDashboardProps = {
  onBack: () => void;
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

export default function KznAdminDashboard({ onBack }: KznAdminDashboardProps) {
  const [registrants, setRegistrants] = useState<KznRegistrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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
          'id, first_name, last_name, email, organisation, phone_number, delegate_category, district, day_one, day_two, gala_dinner, shuttle, accommodation, created_at, registration_complete',
        )
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to load KZN registrants.');
      }

      setRegistrants((data ?? []) as KznRegistrant[]);
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

  const downloadCsv = () => {
    const headers = [
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
    <div className="min-h-screen bg-[#102e5d] flex items-start justify-center p-6 md:p-10 font-sans">
      <div className="w-full max-w-[96rem] bg-white rounded-[1.5rem] shadow-2xl border border-[#173a70] p-6 md:p-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#102e5d] border border-[#102e5d] px-3 py-2 rounded-md hover:bg-[#102e5d] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4860A] mb-2">
              Internal Tool
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-black uppercase text-[#102e5d]">
              KZN Indaba Registrants
            </h1>
            <p className="text-xs text-[#6b7280] mt-2 max-w-xl">
              View and export KZN Liquor Indaba registrations from the KZN Supabase project.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#D4860A] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-[#b87408] transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#173a70]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or organisation"
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

        <div className="overflow-x-auto rounded-2xl border border-[#173a70]/20">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#102e5d] border-b border-[#173a70]">
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-xs text-[#6b7280]">
                    Loading registrants...
                  </td>
                </tr>
              ) : filteredRegistrants.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-xs text-[#6b7280]">
                    No registrants found.
                  </td>
                </tr>
              ) : (
                filteredRegistrants.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 odd:bg-white even:bg-slate-50 hover:bg-[#F5F0E8] transition-colors"
                  >
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
                      {r.registration_complete ? (
                        <CheckCircle2 className="w-5 h-5 text-[#16a34a] mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#dc2626] mx-auto" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
