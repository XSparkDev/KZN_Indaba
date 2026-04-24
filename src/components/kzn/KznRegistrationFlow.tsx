import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { kznSupabase } from '../../lib/kznSupabase';

type Nationality = 'South African' | 'Other' | '';
type PreferredCommunication = 'Email' | 'SMS' | 'WhatsApp' | 'Phone Call' | '';
type YesNo = 'Yes' | 'No' | '';
type GalaOption = 'Yes, I will attend' | 'No, day programme only' | '';

const DISTRICT_OPTIONS = [
  'eThekwini Metropolitan',
  'uMgungundlovu District',
  'King Cetshwayo District',
  'iLembe District',
  'Harry Gwala District',
  'uThukela District',
  'uMkhanyakude District',
  'Zululand District',
  'uMzinyathi District',
  'Amajuba District',
  'uThungulu (Richards Bay area)',
  'Outside KwaZulu-Natal',
  'International/SADC',
];

const DIETARY_OPTIONS = [
  'No Special Requirements',
  'Halaal',
  'Kosher',
  'Vegetarian',
  'Vegan',
  'Gluten Free',
  'Dairy Free',
];

const HEAR_ABOUT_OPTIONS = [
  'Direct invitation from KZNERA',
  'SMS notification',
  'Email notification',
  'KZNERA website',
  'Social media',
  'Ward councillor/Community leader',
  'Colleague/Peer',
  'Trade association',
  'Newspaper/Media',
  'Pre-Indaba District Roundtable',
  'Other',
];

const MIN_PASSWORD_LENGTH = 6;

type KznRegistrationFlowProps = {
  onClose?: () => void;
};

const isValidSouthAfricanId = (value: string) => {
  if (!/^\d{13}$/.test(value)) return false;
  const digits = value.split('').map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8] + digits[10];
  const evenConcat = `${digits[1]}${digits[3]}${digits[5]}${digits[7]}${digits[9]}${digits[11]}`;
  const evenDoubled = String(Number(evenConcat) * 2)
    .split('')
    .reduce((acc, d) => acc + Number(d), 0);
  const total = oddSum + evenDoubled;
  const checkDigit = (10 - (total % 10)) % 10;
  return checkDigit === digits[12];
};

export default function KznRegistrationFlow({ onClose }: KznRegistrationFlowProps) {
  const [screen, setScreen] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xsUserId, setXsUserId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [humanAnswer, setHumanAnswer] = useState('');
  const [reference, setReference] = useState('');

  const [personal, setPersonal] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    organisation: '',
    password: '',
  });

  const [business, setBusiness] = useState({
    nationality: '' as Nationality,
    saIdNumber: '',
    passportNumber: '',
    preferredCommunication: '' as PreferredCommunication,
    delegateCategory: '',
    district: '',
    liquorLicenceNumber: '',
    physicalAddress: '',
    jobTitle: '',
    altContactNumber: '',
  });

  const [attendance, setAttendance] = useState({
    dayOne: false,
    dayTwo: false,
    galaDinner: '' as GalaOption,
    shuttle: '' as YesNo,
    accommodation: '' as YesNo,
    dietaryRequirements: [] as string[],
    accessibilityNeeds: '',
  });

  const [consent, setConsent] = useState({
    popia: false,
    communication: false,
    accuracy: false,
    hearAbout: '',
    topics: '',
  });

  const apiBaseUrl = ((import.meta as any).env?.VITE_BASE_URL || '').trim().replace(/\/+$/, '');
  const conferenceCode = ((import.meta as any).env?.VITE_CONFERENCE_CODE || '').trim();
  const conferenceApiKey = ((import.meta as any).env?.VITE_CONFERENCE_API_KEY || '').trim();
  const googlePlayUrl = ((import.meta as any).env?.VITE_GOOGLE_PLAY_URL || '').trim();
  const appleAppUrl = ((import.meta as any).env?.VITE_APPLE_APP_URL || '').trim();

  const totalScreens = 6;
  const canGoBack = !loading && screen > 1 && !success;
  const stepLabels = ['Personal Info', 'Media & Consent', 'Get App', 'Business', 'Attendance', 'POPI'];

  const getScreenTitle = () => {
    if (screen === 1) return 'Personal Info';
    if (screen === 2) return 'Media & Consent';
    if (screen === 3) return 'Get the XS Card App';
    if (screen === 4) return 'Business Details';
    if (screen === 5) return 'Attendance';
    return 'POPI & Consent';
  };

  const toggleDietary = (item: string) => {
    setAttendance((prev) => {
      const hasItem = prev.dietaryRequirements.includes(item);
      let next = hasItem
        ? prev.dietaryRequirements.filter((v) => v !== item)
        : [...prev.dietaryRequirements, item];

      if (item === 'No Special Requirements' && !hasItem) {
        next = ['No Special Requirements'];
      } else if (item !== 'No Special Requirements') {
        next = next.filter((v) => v !== 'No Special Requirements');
      }

      return { ...prev, dietaryRequirements: next };
    });
  };

  const registerWithXs = async () => {
    if (!personal.firstName || !personal.lastName || !personal.email || !personal.phoneNumber || !personal.organisation || !personal.password) {
      setError('Please complete all required personal information fields.');
      return;
    }
    if (personal.password.trim().length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (!apiBaseUrl) {
      setError('Registration API is not configured. Please set VITE_BASE_URL.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const addUserResponse = await fetch(`${apiBaseUrl}/AddUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(conferenceApiKey ? { Authorization: `Bearer ${conferenceApiKey}` } : {}),
        },
        body: JSON.stringify({
          name: `${personal.firstName} ${personal.lastName}`.trim(),
          surname: personal.lastName.trim(),
          email: personal.email.trim(),
          password: personal.password.trim(),
          conferenceCode,
          termsAccepted: true,
          privacyAccepted: true,
        }),
      });

      const addUserText = await addUserResponse.text();
      const addUserData = addUserText ? JSON.parse(addUserText) : {};

      if (!addUserResponse.ok) {
        setError(addUserData?.message || 'Failed to create XS user profile.');
        return;
      }

      const extractedXsUserId =
        addUserData?.userId ??
        addUserData?.uid ??
        addUserData?.userData?.userId ??
        addUserData?.userData?.uid;

      if (!extractedXsUserId) {
        setError('XS userId missing from AddUser response.');
        return;
      }

      const uploadImagesRes = await fetch(
        `${apiBaseUrl}/Users/${encodeURIComponent(String(extractedXsUserId))}/UploadImages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(conferenceApiKey ? { Authorization: `Bearer ${conferenceApiKey}` } : {}),
          },
          body: JSON.stringify({
            phone: personal.phoneNumber.trim(),
            occupation: null,
            company: personal.organisation.trim(),
          }),
        },
      );

      const uploadData = await uploadImagesRes.json().catch(() => ({}));
      if (!uploadImagesRes.ok) {
        setError(uploadData?.message || 'Failed to create XS card.');
        return;
      }

      setXsUserId(String(extractedXsUserId));
      setScreen(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error while registering on XS Card.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const validateBusinessStep = () => {
    if (!business.nationality || !business.preferredCommunication || !business.delegateCategory || !business.district) {
      setError('Please complete all required business details.');
      return false;
    }
    if (business.nationality === 'South African') {
      if (!business.saIdNumber) {
        setError('South African ID number is required.');
        return false;
      }
    }
    if (business.nationality === 'Other' && !business.passportNumber) {
      setError('Passport number is required for non-South African delegates.');
      return false;
    }
    return true;
  };

  const validateAttendanceStep = () => {
    if (!attendance.dayOne && !attendance.dayTwo) {
      setError('Please select at least one attendance day.');
      return false;
    }
    if (!attendance.galaDinner || !attendance.shuttle || !attendance.accommodation) {
      setError('Please complete all required attendance preferences.');
      return false;
    }
    return true;
  };

  const submitFinalRegistration = async () => {
    if (!consent.popia || !consent.accuracy || !consent.hearAbout) {
      setError('Please complete all required POPI and consent fields.');
      return;
    }
    if (humanAnswer.trim() !== '29') {
      setError('Human verification failed. Please answer 19 + 10 correctly.');
      return;
    }
    if (!kznSupabase) {
      setError('KZN Supabase is not configured. Please set VITE_KZN_SUPABASE_URL and VITE_KZN_SUPABASE_ANON_KEY.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: insertError } = await kznSupabase.from('kzn_indaba_registrants').insert({
        xs_user_id: xsUserId || null,
        first_name: personal.firstName.trim(),
        last_name: personal.lastName.trim(),
        email: personal.email.trim(),
        phone_number: personal.phoneNumber.trim() || null,
        organisation: personal.organisation.trim() || null,
        nationality: business.nationality || null,
        preferred_communication: business.preferredCommunication || null,
        delegate_category: business.delegateCategory || null,
        district: business.district || null,
        liquor_licence_number: business.liquorLicenceNumber.trim() || null,
        physical_address: business.physicalAddress.trim() || null,
        job_title: business.jobTitle.trim() || null,
        alt_contact_number: business.altContactNumber.trim() || null,
        sa_id_number: business.nationality === 'South African' ? business.saIdNumber.trim() : null,
        passport_number: business.nationality === 'Other' ? business.passportNumber.trim() : null,
        day_one: attendance.dayOne,
        day_two: attendance.dayTwo,
        gala_dinner: attendance.galaDinner || null,
        shuttle: attendance.shuttle || null,
        accommodation: attendance.accommodation || null,
        dietary_requirements: attendance.dietaryRequirements.length ? attendance.dietaryRequirements : null,
        accessibility_needs: attendance.accessibilityNeeds.trim() || null,
        consent_popia: consent.popia,
        consent_comms: consent.communication,
        consent_accuracy: consent.accuracy,
        hear_about: consent.hearAbout,
        topics: consent.topics.trim() || null,
        registration_complete: true,
      });

      if (insertError) {
        setError(insertError.message || 'Failed to save registration details.');
        return;
      }

      const { data: refData } = await kznSupabase
        .from('kzn_indaba_registrants')
        .select('reference')
        .eq('email', personal.email.trim())
        .single();

      setReference(refData?.reference || '');
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error while saving registration.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    setError(null);
    if (screen === 1) {
      await registerWithXs();
      return;
    }
    if (screen === 2) {
      setScreen(3);
      return;
    }
    if (screen === 3) {
      setScreen(4);
      return;
    }
    if (screen === 4) {
      if (!validateBusinessStep()) return;
      setScreen(5);
      return;
    }
    if (screen === 5) {
      if (!validateAttendanceStep()) return;
      setScreen(6);
      return;
    }
    await submitFinalRegistration();
  };

  const resetForm = () => {
    setScreen(1);
    setLoading(false);
    setSuccess(false);
    setError(null);
    setReference('');
    setXsUserId('');
    setShowPassword(false);
    setShowCredentials(false);
    setHumanAnswer('');
    setPersonal({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      organisation: '',
      password: '',
    });
    setBusiness({
      nationality: '',
      saIdNumber: '',
      passportNumber: '',
      preferredCommunication: '',
      delegateCategory: '',
      district: '',
      liquorLicenceNumber: '',
      physicalAddress: '',
      jobTitle: '',
      altContactNumber: '',
    });
    setAttendance({
      dayOne: false,
      dayTwo: false,
      galaDinner: '',
      shuttle: '',
      accommodation: '',
      dietaryRequirements: [],
      accessibilityNeeds: '',
    });
    setConsent({
      popia: false,
      communication: false,
      accuracy: false,
      hearAbout: '',
      topics: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-6 font-sans">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl bg-[#1b3461] p-12 md:p-16 rounded-2xl shadow-lg text-center text-white border border-white/10">
          <div className="w-24 h-24 bg-[#16a34a] rounded-full flex items-center justify-center mx-auto mb-8 text-white">
            <span className="text-5xl font-black leading-none">✓</span>
          </div>
          <h2 className="text-4xl font-display font-black uppercase mb-4 text-[#CC0000]">Registration Complete</h2>
          <p className="text-zinc-100 text-lg">Your KZN Liquor Indaba registration has been submitted successfully.</p>
          <div className="mt-6 inline-flex flex-col items-center gap-2 rounded-xl border border-[#CC0000] bg-[#CC0000]/15 px-6 py-4">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#ffd6d6]">
              Your reference number:
            </p>
            <p className="text-2xl font-display font-black tracking-wide text-white">
              {reference || '—'}
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={handleClose}
              className="mt-8 inline-flex items-center justify-center bg-[#CC0000] text-white px-6 py-3 rounded-md font-display font-black uppercase tracking-widest hover:bg-[#990000] transition-all"
            >
              Return to Landing
            </button>
          ) : null}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-6 font-sans">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[720px]">
        <div className="mb-4 rounded-xl bg-[#102e5d] px-4 py-3 text-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <p className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#CC0000]" /> Hosted by KZNERA</p>
            <p className="inline-flex items-center gap-2"><Users className="w-4 h-4 text-[#CC0000]" /> In Partnership with EDTEA</p>
            <p className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#CC0000]" /> Free to Attend</p>
          </div>
        </div>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-[#d1d5db]">
        {onClose ? (
          <button
            type="button"
            onClick={handleClose}
            className="mb-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#1b3461] border border-[#1b3461] px-3 py-2 rounded-md hover:bg-[#1b3461] hover:text-white transition-colors uppercase tracking-wide"
          >
            <span className="text-base leading-none">←</span> Back to landing
          </button>
        ) : null}
        <div className="mb-8 rounded-xl overflow-hidden border border-[#1b3461]/10">
          <div className="bg-[#1b3461] text-white px-6 py-4 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#CC0000]" />
            <p className="text-xs font-semibold tracking-wide">KZN Liquor Regulatory Indaba Registration</p>
          </div>
          <div className="bg-[#1b3461] px-6 py-5">
            <p className="text-[#CC0000] font-display font-black uppercase text-sm tracking-[0.2em]">2026</p>
            <h2 className="text-3xl font-display font-black uppercase text-white mt-2">{getScreenTitle().toUpperCase()}</h2>
            <p className="text-white/70 mt-1 text-sm font-medium">Complete all sections to confirm your delegate profile.</p>
          </div>
          <div className="bg-white px-4 sm:px-6 py-5">
            <div className="flex items-start justify-between">
              {Array.from({ length: totalScreens }, (_, i) => i + 1).map((i) => {
                const isCompleted = i < screen;
                const isActive = i === screen;
                const isPending = i > screen;
                return (
                  <div key={i} className="flex items-start flex-1 last:flex-none">
                    <div className="flex flex-col items-center min-w-[58px]">
                      <div
                        className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-black ${
                          isCompleted
                            ? 'bg-[#16a34a] border-[#16a34a] text-white'
                            : isActive
                              ? 'bg-[#1b3461] border-[#1b3461] text-white'
                              : 'bg-[#f3f4f6] border-[#d1d5db] text-[#9ca3af]'
                        }`}
                      >
                        {isCompleted ? '✓' : i}
                      </div>
                      <p
                        className={`mt-2 text-[10px] uppercase tracking-[0.12em] text-center font-semibold ${
                          isCompleted ? 'text-[#16a34a]' : isActive ? 'text-[#1b3461] font-bold' : 'text-[#9ca3af]'
                        }`}
                      >
                        {stepLabels[i - 1]}
                      </p>
                    </div>
                    {i < totalScreens ? (
                      <div
                        className={`mt-4 h-[2px] flex-1 ${i < screen ? 'bg-[#16a34a]' : 'bg-[#d1d5db]'}`}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error && <div className="mb-6 p-3 bg-red-50 border border-red-200 text-[#dc2626] rounded-xl text-sm font-medium">{error}</div>}

        <AnimatePresence mode="wait">
          {screen === 1 ? (
            <motion.div key="screen1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">First Name <span className="text-[#dc2626]">*</span></label>
                  <input placeholder="e.g. Thabo" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 text-[#1a1a1a] font-medium" value={personal.firstName} onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Last Name <span className="text-[#dc2626]">*</span></label>
                  <input placeholder="e.g. Nkosi" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 text-[#1a1a1a] font-medium" value={personal.lastName} onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Email Address <span className="text-[#dc2626]">*</span></label>
                  <input type="email" placeholder="e.g. thabo.nkosi@company.co.za" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 text-[#1a1a1a] font-medium" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Phone Number <span className="text-[#dc2626]">*</span></label>
                  <input type="tel" placeholder="e.g. +27 82 123 4567" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 text-[#1a1a1a] font-medium" value={personal.phoneNumber} onChange={(e) => setPersonal({ ...personal, phoneNumber: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Organisation / Business Name <span className="text-[#dc2626]">*</span></label>
                <input placeholder="e.g. Nkosi Taverns (Pty) Ltd" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 text-[#1a1a1a] font-medium" value={personal.organisation} onChange={(e) => setPersonal({ ...personal, organisation: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Password <span className="text-[#dc2626]">*</span></label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Create a secure password" className="w-full px-4 pr-12 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 text-[#1a1a1a] font-medium" value={personal.password} onChange={(e) => setPersonal({ ...personal, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6b7280] hover:text-[#102e5d] transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}

          {screen === 2 ? (
            <motion.div key="screen2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="rounded-2xl border border-[#d1d5db] bg-[#F5F0E8] p-4 md:p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#173a70] mb-3">Preview</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] w-full">
                  <p><span className="font-black text-[#1a1a1a]">Name:</span> <span className="text-zinc-600">{`${personal.firstName} ${personal.lastName}`.trim() || '—'}</span></p>
                  <p><span className="font-black text-[#1a1a1a]">Email:</span> <span className="text-zinc-600 break-all">{personal.email || '—'}</span></p>
                  <p><span className="font-black text-[#1a1a1a]">Organisation:</span> <span className="text-zinc-600">{personal.organisation || '—'}</span></p>
                </div>
              </div>
            </motion.div>
          ) : null}

          {screen === 3 ? (
            <motion.div key="screen3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#CC0000]">Optional but strongly recommended</p>
                <p className="text-sm text-[#1a1a1a]">Install the XS Card app to manage your delegate profile, networking, meetings and event updates in real time.</p>
              </div>
              <div className="relative space-y-6 rounded-2xl border border-[#173a70] bg-[#173a70] px-6 py-8">
                <p className="text-sm text-white">Install the XS Card app to keep your delegate details handy, access your tickets and stay in sync with the programme.</p>
                <div className="flex flex-wrap gap-3">
                  {googlePlayUrl ? (
                    <a href={googlePlayUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-md bg-[#CC0000] px-6 py-3 text-xs font-black uppercase tracking-[0.25em] text-white hover:bg-[#990000] transition-colors">
                      Google Play
                    </a>
                  ) : null}
                  {appleAppUrl ? (
                    <a href={appleAppUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-md bg-[#102e5d] px-6 py-3 text-xs font-black uppercase tracking-[0.25em] text-white border border-white/20 transition-colors">
                      App Store
                    </a>
                  ) : null}
                </div>
                <img
                  src="/xscard-logo.png"
                  alt="XS Card"
                  className="hidden md:block absolute right-6 top-1/2 -translate-y-1/2 w-[140px] h-auto object-contain pointer-events-none"
                />
                <div className="space-y-3">
                  <button type="button" onClick={() => setShowCredentials((prev) => !prev)} className="inline-flex items-center justify-center rounded-md border border-white/40 bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-[#102e5d] transition-colors">
                    Show credentials
                  </button>
                  {showCredentials ? (
                    <div className="rounded-xl border border-[#d1d5db] bg-[#F5F0E8] px-4 py-4 text-sm text-[#1a1a1a] space-y-2">
                      <p><span className="font-black">Email:</span> {personal.email || 'Not provided yet'}</p>
                      <p><span className="font-black">Password:</span> {personal.password || 'Not provided yet'}</p>
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="text-[11px] text-[#6b7280] leading-relaxed">Note: You can proceed without installing the app, but we recommend completing this step to unlock the full digital conference experience.</p>
            </motion.div>
          ) : null}

          {screen === 4 ? (
            <motion.div key="screen4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Nationality <span className="text-[#dc2626]">*</span></label>
                  <select className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.nationality} onChange={(e) => setBusiness({ ...business, nationality: e.target.value as Nationality, saIdNumber: '', passportNumber: '' })}>
                    <option value="">Select nationality</option>
                    <option value="South African">South African</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">{business.nationality === 'Other' ? <>Passport Number <span className="text-[#dc2626]">*</span></> : <>SA ID Number <span className="text-[#dc2626]">*</span></>}</label>
                  <input placeholder={business.nationality === 'Other' ? 'e.g. A12345678' : 'e.g. 9001015009087'} className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.nationality === 'Other' ? business.passportNumber : business.saIdNumber} onChange={(e) => business.nationality === 'Other' ? setBusiness({ ...business, passportNumber: e.target.value }) : setBusiness({ ...business, saIdNumber: e.target.value.replace(/\D/g, '').slice(0, 13) })} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Preferred Communication Method <span className="text-[#dc2626]">*</span></label>
                  <select className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.preferredCommunication} onChange={(e) => setBusiness({ ...business, preferredCommunication: e.target.value as PreferredCommunication })}>
                    <option value="">Select method</option>
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Phone Call">Phone Call</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">District / Municipality <span className="text-[#dc2626]">*</span></label>
                  <select className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.district} onChange={(e) => setBusiness({ ...business, district: e.target.value })}>
                    <option value="">Select district</option>
                    {DISTRICT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Delegate Category <span className="text-[#dc2626]">*</span></label>
                <select className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.delegateCategory} onChange={(e) => setBusiness({ ...business, delegateCategory: e.target.value })}>
                  <option value="">Select category</option>
                  <optgroup label="Licensees">
                    <option>Tavern/Shebeen</option><option>Restaurant/On-Consumption</option><option>Bottle Store/Off-Consumption</option><option>Microbrewer/Craft Producer</option><option>Distributor/Wholesaler</option><option>Large Manufacturer</option>
                  </optgroup>
                  <optgroup label="Government & Regulatory">
                    <option>KZNERA Staff</option><option>EDTEA Official</option><option>National Liquor Authority</option><option>Local Government/Municipality</option><option>SAPS/Law Enforcement</option><option>SARS Representative</option>
                  </optgroup>
                  <optgroup label="Other Stakeholders">
                    <option>Financial Institution/DFI</option><option>FMCG/Industry Partner</option><option>Trade Association</option><option>Media Representative</option><option>SADC Representative</option><option>NGO/Community Organisation</option><option>Academic/Researcher</option><option>Other</option>
                  </optgroup>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Liquor Licence Number</label><input placeholder="e.g. KZN-2024-XXXXX" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.liquorLicenceNumber} onChange={(e) => setBusiness({ ...business, liquorLicenceNumber: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Physical Address / Town</label><input placeholder="e.g. 12 Main Street, Pinetown" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.physicalAddress} onChange={(e) => setBusiness({ ...business, physicalAddress: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Job Title / Role</label><input placeholder="e.g. Operations Manager" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.jobTitle} onChange={(e) => setBusiness({ ...business, jobTitle: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Alternative Contact Number</label><input placeholder="e.g. +27 31 000 0000" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.altContactNumber} onChange={(e) => setBusiness({ ...business, altContactNumber: e.target.value })} /></div>
              </div>
            </motion.div>
          ) : null}

          {screen === 5 ? (
            <motion.div key="screen5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Which day(s) attending *</label>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={attendance.dayOne} onChange={(e) => setAttendance({ ...attendance, dayOne: e.target.checked })} /> Day 1</label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={attendance.dayTwo} onChange={(e) => setAttendance({ ...attendance, dayTwo: e.target.checked })} /> Day 2</label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Gala Dinner Attendance *</label>
                <div className="flex flex-col gap-2">
                  {(['Yes, I will attend', 'No, day programme only'] as GalaOption[]).map((option) => (
                    <label key={option} className="inline-flex items-center gap-2 text-sm font-medium"><input type="radio" checked={attendance.galaDinner === option} onChange={() => setAttendance({ ...attendance, galaDinner: option })} /> {option}</label>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Shuttle Transport Required *</label>
                  <div className="flex gap-4">{(['Yes', 'No'] as YesNo[]).map((option) => <label key={option} className="inline-flex items-center gap-2 text-sm font-medium"><input type="radio" checked={attendance.shuttle === option} onChange={() => setAttendance({ ...attendance, shuttle: option })} /> {option}</label>)}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Accommodation Required *</label>
                  <div className="flex gap-4">{(['Yes', 'No'] as YesNo[]).map((option) => <label key={option} className="inline-flex items-center gap-2 text-sm font-medium"><input type="radio" checked={attendance.accommodation === option} onChange={() => setAttendance({ ...attendance, accommodation: option })} /> {option}</label>)}</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Dietary Requirements (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((item) => (
                    <button key={item} type="button" onClick={() => toggleDietary(item)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${attendance.dietaryRequirements.includes(item) ? 'border-[#102e5d] bg-[#102e5d] text-white' : 'border-[#d1d5db] text-[#6b7280]'}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Accessibility Needs (optional)</label>
                <textarea rows={4} placeholder="e.g. Wheelchair access required" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a] resize-none" value={attendance.accessibilityNeeds} onChange={(e) => setAttendance({ ...attendance, accessibilityNeeds: e.target.value })} />
              </div>
            </motion.div>
          ) : null}

          {screen === 6 ? (
            <motion.div key="screen6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <label className="flex items-start gap-3 text-sm font-medium"><input type="checkbox" checked={consent.popia} onChange={(e) => setConsent({ ...consent, popia: e.target.checked })} /> POPIA consent *</label>
              <label className="flex items-start gap-3 text-sm font-medium"><input type="checkbox" checked={consent.communication} onChange={(e) => setConsent({ ...consent, communication: e.target.checked })} /> Communication consent (optional)</label>
              <label className="flex items-start gap-3 text-sm font-medium"><input type="checkbox" checked={consent.accuracy} onChange={(e) => setConsent({ ...consent, accuracy: e.target.checked })} /> I confirm accuracy and authorisation *</label>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">How did you hear about the event? <span className="text-[#dc2626]">*</span></label>
                <select className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={consent.hearAbout} onChange={(e) => setConsent({ ...consent, hearAbout: e.target.value })}>
                  <option value="">Select an option</option>
                  {HEAR_ABOUT_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">Topics / Issues (optional)</label>
                <textarea rows={4} placeholder="e.g. Licensing reform, township trader support" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a] resize-none" value={consent.topics} onChange={(e) => setConsent({ ...consent, topics: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Human verification: 19 + 10 = *</label>
                <input placeholder="29" className="w-full md:w-40 px-4 py-3 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={humanAnswer} onChange={(e) => setHumanAnswer(e.target.value)} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-8">
          <button type="button" disabled={!canGoBack} onClick={() => setScreen((prev) => Math.max(1, prev - 1))} className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-4 rounded-md border border-[#1b3461] text-xs font-semibold uppercase tracking-[0.18em] text-center text-[#1b3461] hover:bg-[#1b3461] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="text-base leading-none mr-1">←</span> Back
          </button>
          <button type="button" disabled={loading} onClick={() => void handleContinue()} className={`w-full sm:w-auto sm:ml-auto px-5 sm:px-8 py-4 ${screen === 6 ? 'bg-[#CC0000] hover:bg-[#990000]' : 'bg-[#1b3461] hover:bg-[#102e5d]'} text-white rounded-md font-display font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}>
            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>
              {screen < 6 ? (screen === 3 ? 'Complete Registration' : 'Continue') : 'Confirm Registration'}
              <span className="text-base leading-none">→</span>
            </>}
          </button>
        </div>
      </motion.div>
      </motion.div>
    </div>
  );
}
