import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ShieldCheck, Users } from 'lucide-react';
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
  'UGU District',
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

const LIQUOR_LICENSE_CONSULTANT = 'Liquor License Consultant';

/** Visible suffix for fields that are not required */
function OptionalLabelSuffix() {
  return (
    <span className="text-[#6b7280] normal-case tracking-normal font-semibold"> (optional)</span>
  );
}

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

/** Matches post-registration “Fee Structure” packages */
const INDABA_FEE_PACKAGES = [
  'Indaba Pass – R500',
  'Gala Dinner Pass – R600',
  'Indaba Combo Pass – R900',
  'Gala Dinner (Liquor Trader Association Members) – R300 (discounted)',
] as const;

function RegistrationFeeFilmTicker() {
  const doubled = [...INDABA_FEE_PACKAGES, ...INDABA_FEE_PACKAGES];
  return (
    <div className="w-full min-w-0">
      <p className="text-xs sm:text-[11px] uppercase tracking-[0.16em] text-white/70 mb-2 font-semibold">
        Delegate packages
      </p>
      <div className="kzn-film-strip-shell flex min-h-[3.5rem] sm:min-h-[3.25rem] items-center py-2 sm:py-2.5">
        <div className="kzn-film-marquee-track">
          {doubled.map((label, i) => (
            <span key={`${label}-${i}`} className="inline-flex items-center shrink-0 px-2 sm:px-3">
              <span className="text-sm sm:text-[15px] font-semibold tracking-wide text-[#fff7d6] whitespace-nowrap leading-snug [text-shadow:0_1px_2px_rgb(0_0_0_/_0.45)]">
                {label}
              </span>
              <span
                className="mx-3 sm:mx-4 text-[#CC0000] text-sm sm:text-base opacity-95 select-none translate-y-px"
                aria-hidden
              >
                ●
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  /** User already on XS / duplicate-email path: skips Media, Get App (screens 2–3). */
  const [skippedXsScreens, setSkippedXsScreens] = useState(false);
  /** Drives password visibility and XS signup; default assumes new XS registration. */
  const [xsMembership, setXsMembership] = useState<'yes' | 'no'>('no');
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

  const isLiquorLicenseConsultantDelegate = business.delegateCategory === LIQUOR_LICENSE_CONSULTANT;

  const apiBaseUrl = ((import.meta as any).env?.VITE_BASE_URL || '').trim().replace(/\/+$/, '');
  const conferenceCode = ((import.meta as any).env?.VITE_CONFERENCE_CODE || '').trim();
  const conferenceApiKey = ((import.meta as any).env?.VITE_CONFERENCE_API_KEY || '').trim();
  const googlePlayUrl = ((import.meta as any).env?.VITE_GOOGLE_PLAY_URL || '').trim();
  const appleAppUrl = ((import.meta as any).env?.VITE_APPLE_APP_URL || '').trim();
  const proofOfBankingPath = '/00_ABSA_Bank Confirmation_4079562528_220426.pdf';
  const proofOfBankingHref = encodeURI(proofOfBankingPath);

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

  const normalizedRegistrationEmail = () => personal.email.trim().toLowerCase();

  const assertNotAlreadyRegisteredForEvent = async (): Promise<boolean> => {
    const emailTrim = personal.email.trim();
    const emailNorm = emailTrim.toLowerCase();
    if (!emailNorm) {
      setError('Please enter your email address.');
      return false;
    }
    if (!kznSupabase) {
      setError('KZN Supabase is not configured. Please set VITE_KZN_SUPABASE_URL and VITE_KZN_SUPABASE_ANON_KEY.');
      return false;
    }
    const variants = Array.from(new Set([emailNorm, emailTrim]));
    for (const em of variants) {
      const { data: existing, error: lookupError } = await kznSupabase
        .from('kzn_indaba_registrants')
        .select('id')
        .eq('email', em)
        .maybeSingle();

      if (lookupError) {
        setError(
          lookupError.message ||
            'Could not verify registration status. Please try again or contact support.',
        );
        return false;
      }
      if (existing?.id) {
        setError(
          'This email is already registered for the KZN Liquor Indaba. If you need to change your details, please contact the organisers.',
        );
        return false;
      }
    }
    return true;
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
    if (
      !personal.firstName ||
      !personal.lastName ||
      !personal.email ||
      !personal.phoneNumber ||
      !personal.organisation ||
      !personal.password
    ) {
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
    setInfoMessage(null);
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
      let addUserData: Record<string, unknown> = {};
      try {
        addUserData = addUserText ? (JSON.parse(addUserText) as Record<string, unknown>) : {};
      } catch {
        addUserData = {};
      }

      const duplicateEmailOnXs =
        addUserData?.code === 'EMAIL_ALREADY_EXISTS' ||
        String(addUserData?.message || '')
          .toLowerCase()
          .includes('account with this email already exists');

      if (!addUserResponse.ok && duplicateEmailOnXs) {
        setSkippedXsScreens(true);
        setXsUserId('');
        setInfoMessage(
          'This email already has an XS Card account. You can continue with Indaba registration — we will not create a new XS account.',
        );
        setScreen(4);
        return;
      }

      if (!addUserResponse.ok) {
        setError(String(addUserData?.message || 'Failed to create XS user profile.'));
        return;
      }

      const extractedXsUserId =
        addUserData?.userId ??
        addUserData?.uid ??
        (addUserData?.userData as Record<string, unknown> | undefined)?.userId ??
        (addUserData?.userData as Record<string, unknown> | undefined)?.uid;

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
        setError((uploadData as { message?: string })?.message || 'Failed to create XS card.');
        return;
      }

      setSkippedXsScreens(false);
      setXsUserId(String(extractedXsUserId));
      setScreen(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error while registering on XS Card.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const continueFromPersonalStep = async () => {
    setError(null);
    setInfoMessage(null);

    if (
      !personal.firstName ||
      !personal.lastName ||
      !personal.email ||
      !personal.phoneNumber ||
      !personal.organisation
    ) {
      setError('Please complete all required personal information fields.');
      return;
    }

    if (xsMembership === 'no') {
      if (!personal.password.trim()) {
        setError('Password is required to create your XS Card account.');
        return;
      }
      if (personal.password.trim().length < MIN_PASSWORD_LENGTH) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
    }

    const okEvent = await assertNotAlreadyRegisteredForEvent();
    if (!okEvent) return;

    if (xsMembership === 'yes') {
      setSkippedXsScreens(true);
      setXsUserId('');
      setScreen(4);
      return;
    }

    setSkippedXsScreens(false);
    await registerWithXs();
  };

  const validateBusinessStep = () => {
    const isConsultant = business.delegateCategory === LIQUOR_LICENSE_CONSULTANT;
    if (!business.nationality || !business.preferredCommunication || !business.delegateCategory) {
      setError('Please complete all required business details.');
      return false;
    }
    if (!isConsultant && !business.district) {
      setError('Please select your district or municipality.');
      return false;
    }
    if (!isConsultant && business.nationality === 'South African') {
      if (!business.saIdNumber) {
        setError('South African ID number is required.');
        return false;
      }
    }
    if (!isConsultant && business.nationality === 'Other' && !business.passportNumber) {
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
        email: normalizedRegistrationEmail(),
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
        const msg = insertError.message || 'Failed to save registration details.';
        const dup =
          insertError.code === '23505' ||
          msg.toLowerCase().includes('duplicate') ||
          msg.toLowerCase().includes('unique');
        setError(
          dup
            ? 'This email is already registered for the KZN Liquor Indaba. If you need help, please contact the organisers.'
            : msg,
        );
        return;
      }

      const { data: refData } = await kznSupabase
        .from('kzn_indaba_registrants')
        .select('reference')
        .eq('email', normalizedRegistrationEmail())
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
      await continueFromPersonalStep();
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

  const goBack = () => {
    if (screen === 4 && skippedXsScreens) {
      setScreen(1);
      return;
    }
    setScreen((prev) => Math.max(1, prev - 1));
  };

  const resetForm = () => {
    setScreen(1);
    setLoading(false);
    setSuccess(false);
    setError(null);
    setInfoMessage(null);
    setSkippedXsScreens(false);
    setXsMembership('no');
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
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 font-sans">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl bg-[#1b3461] px-5 py-8 sm:p-10 md:p-16 rounded-2xl shadow-lg text-center text-white border border-white/10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#16a34a] rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 text-white">
            <span className="text-4xl sm:text-5xl font-black leading-none">✓</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-black uppercase mb-3 sm:mb-4 text-[#CC0000] leading-tight px-1">
            Registration Complete
          </h2>
          <p className="text-zinc-100 text-base sm:text-lg px-1 leading-relaxed">
            Your KZN Liquor Indaba registration has been submitted successfully.
          </p>
          <div className="mt-6 inline-flex w-full max-w-md flex-col items-center gap-2 rounded-xl border border-[#CC0000] bg-[#CC0000]/15 px-4 py-4 sm:px-6">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#ffd6d6]">
              Your reference number:
            </p>
            <p className="text-lg sm:text-2xl font-display font-black tracking-wide text-white break-all px-2">
              {reference || '—'}
            </p>
          </div>
          <p className="mt-4 text-sm text-zinc-100 max-w-2xl mx-auto px-1 leading-relaxed">
            Delegates must use this reference code as their payment reference when making their EFT or direct deposit.
          </p>
          <div className="mt-6 px-1">
            <p className="text-sm text-zinc-100">
              Click download for the proof of banking.
            </p>
            <a
              href={proofOfBankingHref}
              download="00_ABSA_Bank Confirmation_4079562528_220426.pdf"
              className="mt-3 w-full sm:w-auto inline-flex min-h-[48px] items-center justify-center rounded-md bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#1b3461] hover:bg-zinc-100 transition-colors"
            >
              Download Proof of Banking
            </a>
            <p className="mt-3 text-sm text-zinc-100 break-words">
              Send proof of payment to enquiries@kznera.org.za.
            </p>
          </div>
          <div className="mt-6 rounded-xl border border-white/15 bg-white/10 px-4 py-5 sm:px-5 text-left max-w-2xl mx-auto">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd6d6]">
              Fee Structure for Reference
            </p>
            <p className="mt-3 text-sm text-zinc-100">
              The following attendance packages are subject to payment:
            </p>
            <ul className="mt-2 space-y-2 text-sm text-zinc-100 list-disc pl-5 break-words">
              {INDABA_FEE_PACKAGES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-zinc-100">
              The following delegate categories are exempt from payment and will NOT be required to complete any payment steps:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-100 list-disc pl-5">
              <li>VIP delegates</li>
              <li>Panelists</li>
            </ul>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={handleClose}
              className="mt-8 w-full sm:w-auto inline-flex min-h-[48px] items-center justify-center bg-[#CC0000] text-white px-6 py-3 rounded-md font-display font-black uppercase tracking-widest hover:bg-[#990000] transition-all"
            >
              Return to Landing
            </button>
          ) : null}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6 font-sans">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[720px] min-w-0">
        <div className="mb-3 sm:mb-4 rounded-xl bg-[#102e5d] px-3 py-3 sm:px-4 text-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <p className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#CC0000]" /> Hosted by KZNERA
            </p>
            <p className="inline-flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0 text-[#CC0000]" /> In Partnership with EDTEA
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <RegistrationFeeFilmTicker />
          </div>
        </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full min-w-0 bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg border border-[#d1d5db] [&_input:not([type='checkbox']):not([type='radio'])]:text-base [&_select]:text-base [&_textarea]:text-base"
      >
        {onClose ? (
          <button
            type="button"
            onClick={handleClose}
            className="mb-5 sm:mb-6 w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 text-sm font-semibold text-[#1b3461] border border-[#1b3461] px-4 py-2.5 rounded-md hover:bg-[#1b3461] hover:text-white transition-colors uppercase tracking-wide"
          >
            <span className="text-base leading-none">←</span> Back to landing
          </button>
        ) : null}
        <div className="mb-6 sm:mb-8 rounded-xl overflow-hidden border border-[#1b3461]/10">
          <div className="bg-[#1b3461] text-white px-4 sm:px-6 py-3 sm:py-4 flex items-start sm:items-center gap-3">
            <ShieldCheck className="w-5 h-5 shrink-0 text-[#CC0000] mt-0.5 sm:mt-0" />
            <p className="text-[11px] sm:text-xs font-semibold tracking-wide leading-snug break-words">
              KZN Liquor Regulatory Indaba Registration
            </p>
          </div>
          <div className="bg-[#1b3461] px-4 sm:px-6 py-4 sm:py-5">
            <p className="text-[#CC0000] font-display font-black uppercase text-xs sm:text-sm tracking-[0.2em]">2026</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-black uppercase text-white mt-2 leading-tight break-words">
              {getScreenTitle().toUpperCase()}
            </h2>
            <p className="text-white/70 mt-1.5 text-xs sm:text-sm font-medium leading-relaxed">
              Complete all sections to confirm your delegate profile.
            </p>
          </div>
          <div className="bg-white px-4 sm:px-6 py-4 sm:py-5">
            <div className="sm:hidden space-y-2">
              <div className="flex justify-between items-baseline gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1b3461]">Progress</p>
                <p className="text-[11px] font-semibold text-[#6b7280] tabular-nums">
                  Step {screen} of {totalScreens}
                </p>
              </div>
              <div
                className="h-2.5 rounded-full bg-[#e5e7eb] overflow-hidden"
                role="progressbar"
                aria-valuenow={screen}
                aria-valuemin={1}
                aria-valuemax={totalScreens}
                aria-valuetext={`Step ${screen} of ${totalScreens}: ${stepLabels[screen - 1]}`}
              >
                <div
                  className="h-full rounded-full bg-[#16a34a] transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.round((screen / totalScreens) * 100)}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-[#1b3461] leading-snug pt-0.5">{stepLabels[screen - 1]}</p>
            </div>
            <div className="hidden sm:flex items-start justify-between gap-1 min-w-0 overflow-x-auto pb-1">
              {Array.from({ length: totalScreens }, (_, i) => i + 1).map((i) => {
                const isCompleted = i < screen;
                const isActive = i === screen;
                return (
                  <div key={i} className="flex items-start flex-1 min-w-0 last:flex-[0_0_auto]">
                    <div className="flex flex-col items-center w-[52px] md:w-[58px] shrink-0">
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
                        className={`mt-2 text-[9px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.12em] text-center font-semibold leading-tight px-0.5 ${
                          isCompleted ? 'text-[#16a34a]' : isActive ? 'text-[#1b3461] font-bold' : 'text-[#9ca3af]'
                        }`}
                      >
                        {stepLabels[i - 1]}
                      </p>
                    </div>
                    {i < totalScreens ? (
                      <div className={`mt-4 h-[2px] flex-1 min-w-[6px] shrink ${i < screen ? 'bg-[#16a34a]' : 'bg-[#d1d5db]'}`} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {infoMessage ? (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm font-medium break-words">
            {infoMessage}
          </div>
        ) : null}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-[#dc2626] rounded-xl text-sm font-medium break-words">{error}</div>
        )}

        <AnimatePresence mode="wait">
          {screen === 1 ? (
            <motion.div key="screen1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">
                  Do you already have an XS Card account? <span className="text-[#dc2626]">*</span>
                </label>
                <select
                  className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]"
                  value={xsMembership}
                  onChange={(e) => setXsMembership(e.target.value as 'yes' | 'no')}
                >
                  <option value="yes">Yes — I already use XS Card</option>
                  <option value="no">No — create my XS Card account as part of registration</option>
                </select>
                {xsMembership === 'yes' ? (
                  <p className="text-xs text-[#6b7280] leading-relaxed">
                    You will enter your personal details here, then continue to Business and the rest of the form. XS Card signup steps are skipped because you already have an account.
                  </p>
                ) : null}
                {xsMembership === 'no' ? (
                  <p className="text-xs text-[#6b7280] leading-relaxed">
                    We will create your XS Card profile using the password you choose below, then show a short preview and app links before business details.
                  </p>
                ) : null}
              </div>

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

              {xsMembership === 'no' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">
                    Password (XS Card account) <span className="text-[#dc2626]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a secure password"
                      className="w-full px-4 pr-12 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 text-[#1a1a1a] font-medium"
                      value={personal.password}
                      onChange={(e) => setPersonal({ ...personal, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[#6b7280] hover:text-[#102e5d] transition-colors touch-manipulation"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : null}
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
              <div className="relative space-y-6 rounded-2xl border border-[#173a70] bg-[#173a70] px-4 py-6 sm:px-6 sm:py-8">
                <p className="text-sm text-white leading-relaxed">Install the XS Card app to keep your delegate details handy, access your tickets and stay in sync with the programme.</p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                  {googlePlayUrl ? (
                    <a href={googlePlayUrl} target="_blank" rel="noreferrer" className="inline-flex w-full sm:w-auto min-h-[48px] items-center justify-center rounded-md bg-[#CC0000] px-6 py-3 text-xs font-black uppercase tracking-[0.25em] text-white hover:bg-[#990000] transition-colors touch-manipulation">
                      Google Play
                    </a>
                  ) : null}
                  {appleAppUrl ? (
                    <a href={appleAppUrl} target="_blank" rel="noreferrer" className="inline-flex w-full sm:w-auto min-h-[48px] items-center justify-center rounded-md bg-[#102e5d] px-6 py-3 text-xs font-black uppercase tracking-[0.25em] text-white border border-white/20 transition-colors touch-manipulation">
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
                  <button type="button" onClick={() => setShowCredentials((prev) => !prev)} className="inline-flex w-full sm:w-auto min-h-[48px] items-center justify-center rounded-md border border-white/40 bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-[#102e5d] transition-colors touch-manipulation">
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
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">
                    {business.nationality === 'Other' ? (
                      <>
                        Passport Number{' '}
                        {isLiquorLicenseConsultantDelegate ? (
                          <OptionalLabelSuffix />
                        ) : (
                          <span className="text-[#dc2626]">*</span>
                        )}
                      </>
                    ) : (
                      <>
                        SA ID Number{' '}
                        {isLiquorLicenseConsultantDelegate ? (
                          <OptionalLabelSuffix />
                        ) : (
                          <span className="text-[#dc2626]">*</span>
                        )}
                      </>
                    )}
                  </label>
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
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">
                    District / Municipality{' '}
                    {isLiquorLicenseConsultantDelegate ? (
                      <OptionalLabelSuffix />
                    ) : (
                      <span className="text-[#dc2626]">*</span>
                    )}
                  </label>
                  <select className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.district} onChange={(e) => setBusiness({ ...business, district: e.target.value })}>
                    <option value="">{isLiquorLicenseConsultantDelegate ? 'Select district (optional)' : 'Select district'}</option>
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
                    <option>Financial Institution/DFI</option><option>FMCG/Industry Partner</option><option>Trade Association</option><option>Liquor License Consultant</option><option>Media Representative</option><option>SADC Representative</option><option>NGO/Community Organisation</option><option>Academic/Researcher</option><option>Other</option>
                  </optgroup>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">
                    Liquor Licence Number
                    <OptionalLabelSuffix />
                  </label>
                  <input placeholder="e.g. KZN-2024-XXXXX" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.liquorLicenceNumber} onChange={(e) => setBusiness({ ...business, liquorLicenceNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">
                    Physical Address / Town
                    <OptionalLabelSuffix />
                  </label>
                  <input placeholder="e.g. 12 Main Street, Pinetown" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.physicalAddress} onChange={(e) => setBusiness({ ...business, physicalAddress: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">
                    Job Title / Role
                    <OptionalLabelSuffix />
                  </label>
                  <input placeholder="e.g. Operations Manager" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.jobTitle} onChange={(e) => setBusiness({ ...business, jobTitle: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">
                    Alternative Contact Number
                    <OptionalLabelSuffix />
                  </label>
                  <input placeholder="e.g. +27 31 000 0000" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={business.altContactNumber} onChange={(e) => setBusiness({ ...business, altContactNumber: e.target.value })} />
                </div>
              </div>
            </motion.div>
          ) : null}

          {screen === 5 ? (
            <motion.div key="screen5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Which day(s) attending *</label>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-3 text-sm font-medium min-h-[44px] py-1 touch-manipulation">
                    <input type="checkbox" className="size-4 shrink-0" checked={attendance.dayOne} onChange={(e) => setAttendance({ ...attendance, dayOne: e.target.checked })} /> Day 1
                  </label>
                  <label className="inline-flex items-center gap-3 text-sm font-medium min-h-[44px] py-1 touch-manipulation">
                    <input type="checkbox" className="size-4 shrink-0" checked={attendance.dayTwo} onChange={(e) => setAttendance({ ...attendance, dayTwo: e.target.checked })} /> Day 2
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Gala Dinner Attendance *</label>
                <div className="flex flex-col gap-2">
                  {(['Yes, I will attend', 'No, day programme only'] as GalaOption[]).map((option) => (
                    <label key={option} className="inline-flex items-start gap-3 text-sm font-medium min-h-[44px] py-1 touch-manipulation leading-snug">
                      <input type="radio" className="size-4 shrink-0 mt-0.5" checked={attendance.galaDinner === option} onChange={() => setAttendance({ ...attendance, galaDinner: option })} /> {option}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Shuttle Transport Required *</label>
                  <div className="flex flex-wrap gap-4">{(['Yes', 'No'] as YesNo[]).map((option) => <label key={option} className="inline-flex items-center gap-3 text-sm font-medium min-h-[44px] py-1 touch-manipulation"><input type="radio" className="size-4 shrink-0" checked={attendance.shuttle === option} onChange={() => setAttendance({ ...attendance, shuttle: option })} /> {option}</label>)}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Accommodation Required *</label>
                  <div className="flex flex-wrap gap-4">{(['Yes', 'No'] as YesNo[]).map((option) => <label key={option} className="inline-flex items-center gap-3 text-sm font-medium min-h-[44px] py-1 touch-manipulation"><input type="radio" className="size-4 shrink-0" checked={attendance.accommodation === option} onChange={() => setAttendance({ ...attendance, accommodation: option })} /> {option}</label>)}</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">
                  Dietary Requirements
                  <OptionalLabelSuffix />
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((item) => (
                    <button key={item} type="button" onClick={() => toggleDietary(item)} className={`rounded-full border px-3 py-2.5 min-h-[44px] text-xs font-bold inline-flex items-center justify-center text-center touch-manipulation ${attendance.dietaryRequirements.includes(item) ? 'border-[#102e5d] bg-[#102e5d] text-white' : 'border-[#d1d5db] text-[#6b7280]'}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">
                  Accessibility Needs
                  <OptionalLabelSuffix />
                </label>
                <textarea rows={4} placeholder="e.g. Wheelchair access required" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a] resize-none" value={attendance.accessibilityNeeds} onChange={(e) => setAttendance({ ...attendance, accessibilityNeeds: e.target.value })} />
              </div>
            </motion.div>
          ) : null}

          {screen === 6 ? (
            <motion.div key="screen6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <label className="flex items-start gap-3 text-sm font-medium min-h-[44px] py-1 touch-manipulation">
                <input type="checkbox" className="size-4 shrink-0 mt-0.5" checked={consent.popia} onChange={(e) => setConsent({ ...consent, popia: e.target.checked })} /> POPIA consent *
              </label>
              <label className="flex items-start gap-3 text-sm font-medium min-h-[44px] py-1 touch-manipulation">
                <input type="checkbox" className="size-4 shrink-0 mt-0.5" checked={consent.communication} onChange={(e) => setConsent({ ...consent, communication: e.target.checked })} />
                <span>
                  Communication consent
                  <OptionalLabelSuffix />
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm font-medium min-h-[44px] py-1 touch-manipulation">
                <input type="checkbox" className="size-4 shrink-0 mt-0.5" checked={consent.accuracy} onChange={(e) => setConsent({ ...consent, accuracy: e.target.checked })} /> I confirm accuracy and authorisation *
              </label>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">How did you hear about the event? <span className="text-[#dc2626]">*</span></label>
                <select className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={consent.hearAbout} onChange={(e) => setConsent({ ...consent, hearAbout: e.target.value })}>
                  <option value="">Select an option</option>
                  {HEAR_ABOUT_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1b3461]">
                  Topics / Issues
                  <OptionalLabelSuffix />
                </label>
                <textarea rows={4} placeholder="e.g. Licensing reform, township trader support" className="w-full px-4 py-4 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a] resize-none" value={consent.topics} onChange={(e) => setConsent({ ...consent, topics: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#102e5d]">Human verification: 19 + 10 = *</label>
                <input placeholder="29" className="w-full md:w-40 px-4 py-3 bg-white border border-[#d1d5db] rounded-lg outline-none focus:border-[#1b3461] focus:ring-2 focus:ring-[#1b3461]/15 font-medium text-[#1a1a1a]" value={humanAnswer} onChange={(e) => setHumanAnswer(e.target.value)} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 pt-6 sm:pt-8">
          <button type="button" disabled={!canGoBack} onClick={goBack} className="w-full sm:w-auto inline-flex min-h-[48px] items-center justify-center px-4 sm:px-6 py-3.5 rounded-md border border-[#1b3461] text-xs font-semibold uppercase tracking-[0.18em] text-center text-[#1b3461] hover:bg-[#1b3461] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation order-2 sm:order-1">
            <span className="text-base leading-none mr-1">←</span> Back
          </button>
          <button type="button" disabled={loading} onClick={() => void handleContinue()} className={`w-full sm:w-auto sm:ml-auto order-1 sm:order-2 min-h-[48px] px-5 sm:px-8 py-3.5 ${screen === 6 ? 'bg-[#CC0000] hover:bg-[#990000]' : 'bg-[#1b3461] hover:bg-[#102e5d]'} text-white rounded-md font-display font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-center sm:whitespace-nowrap touch-manipulation`}>
            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>
              <span className="text-center leading-tight">{screen < 6 ? (screen === 3 ? 'Complete Registration' : 'Continue') : 'Confirm Registration'}</span>
              <span className="text-base leading-none shrink-0">→</span>
            </>}
          </button>
        </div>
      </motion.div>
      </motion.div>
    </div>
  );
}
