import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Scale,
  ShieldCheck,
  TrendingUp,
  Heart,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type KznLandingPageProps = {
  onRegisterClick: () => void;
};

const HERO_IMAGES = ['/herro1.png', '/herro2.png', '/herro3.png'];
const TARGET_DATE = new Date('2026-05-08T00:00:00+02:00');

const AGENDA_CARDS = [
  {
    icon: FileText,
    title: 'Licensing & Applications',
    points: [
      'New licence applications & transfers',
      'Renewals (submit 6 months before expiry)',
      'Special event liquor permits',
      'Micro-manufacturer registrations',
    ],
    highlight: false,
  },
  {
    icon: Scale,
    title: 'Legislative Reform',
    points: [
      'Draft KZN Liquor Licensing Amendment Bill, 2024',
      'Stakeholder comment & public participation',
      'Liquor Fee Model review & survey',
      'New Liquor Licensing Tribunal framework',
    ],
    highlight: true,
  },
  {
    icon: ShieldCheck,
    title: 'Compliance & Enforcement',
    points: [
      'Premises conditions monitoring',
      'Illicit & counterfeit liquor crackdowns',
      'Under-age & after-hours trading enforcement',
      'Multidisciplinary SAPS operations',
    ],
    highlight: false,
  },
  {
    icon: TrendingUp,
    title: 'Transformation & SMMEs',
    points: [
      'Transformation Fund — Tier 1 funding open',
      'Township & rural liquor trader support',
      'Emerging micro-manufacturer development',
      'B-BBEE compliance in the liquor sector',
    ],
    highlight: false,
  },
  {
    icon: Heart,
    title: 'Harm Reduction & Public Safety',
    points: [
      'Responsible trading awareness campaigns',
      'Youth & gender-based violence prevention',
      'Festive season roadblocks & beach activations',
      'Drinking & driving prevention partnerships',
    ],
    highlight: false,
  },
  {
    icon: Users,
    title: 'Stakeholder Engagement',
    points: [
          'Liquor Indaba 2026 — Sibaya Casino, eThekwini',
      'Industry deal-making & regulatory dialogue',
      'Traditional leadership & community forums',
      'Inter-governmental compliance partnerships',
    ],
    highlight: false,
  },
];

const getTimeParts = () => {
  const now = new Date().getTime();
  const diff = TARGET_DATE.getTime() - now;
  const remaining = Math.max(diff, 0);
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);
  return { days, hours, minutes, seconds };
};

const pad = (value: number) => String(value).padStart(2, '0');

type PdfPreviewId = 'programme' | 'accommodation';

const PDF_PREVIEW_CONFIG: Record<
  PdfPreviewId,
  {
    path: string;
    downloadFilename: string;
    eyebrow: string;
    title: string;
    iframeTitle: string;
    failMessage: string;
    downloadLabel: string;
  }
> = {
  programme: {
    path: '/KZN_Liquor_Indaba_Programme.pdf',
    downloadFilename: 'KZN_Liquor_Indaba_Programme.pdf',
    eyebrow: 'Programme Preview',
    title: 'KZN Liquor Indaba Programme Information',
    iframeTitle: 'KZN Liquor Indaba Programme',
    failMessage: 'Preview unavailable - please download the programme.',
    downloadLabel: 'Download Programme',
  },
  accommodation: {
    path: '/KZN_Liquor_Indaba_Business_Expo_Accommodation_Guide.pdf',
    downloadFilename: 'KZN_Liquor_Indaba_Business_Expo_Accommodation_Guide.pdf',
    eyebrow: 'Accommodation Guide',
    title: 'Business Expo & Accommodation Guide',
    iframeTitle: 'KZN Liquor Indaba Business Expo Accommodation Guide',
    failMessage: 'Preview unavailable - please download the accommodation guide.',
    downloadLabel: 'Download Guide',
  },
};

export default function KznLandingPage({ onRegisterClick }: KznLandingPageProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [timeLeft, setTimeLeft] = useState(getTimeParts);
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewId | null>(null);
  const [pdfPreviewFailed, setPdfPreviewFailed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeParts());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const carousel = window.setInterval(() => {
      setActiveImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => window.clearInterval(carousel);
  }, []);

  const qrValue = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${window.location.pathname}?register=1`;
    }
    return 'https://www.kznera.org.za/iframe-embed_Version2.html?register=1';
  }, []);

  const programmeFileHref = encodeURI(PDF_PREVIEW_CONFIG.programme.path);

  const downloadQrCode = () => {
    const svg = document.getElementById('kzn-qr-svg');
    if (!(svg instanceof SVGSVGElement)) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 700;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 40, 40, 620, 620);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = 'KZNERA-Liquor-Indaba-2026-QR.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#1a1a1a] font-sans">
      <div id="poster-section" className="w-full pt-0 pb-[60px]">
        <div
          id="poster-strip"
          className="w-full flex justify-center"
          style={{
            margin: 0,
            padding: 0,
            background: '#FFFFFF',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div className="relative w-full max-w-[800px]">
            <img
              src="/poster2.png"
              alt="KZN Indaba poster"
              className="block w-full h-auto"
              style={{
                margin: 0,
                padding: 0,
                border: 'none',
                objectFit: 'contain',
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 h-full w-6"
              style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)' }}
            />
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-[56%_44%] lg:min-h-[90vh]">
        <div className="bg-white px-4 sm:px-10 lg:px-14 py-8 sm:py-10 flex flex-col justify-center">
          <img
            src="/kznera-logo.png"
            alt="KZNERA"
            className="mb-8 h-auto w-[170px] max-w-full object-contain object-left"
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6b7280]">
            The Theme
          </p>
          <div className="mt-3 bg-[#1b3461] text-white px-5 py-4 rounded-md">
            <p className="text-sm font-bold uppercase tracking-wide">
              Repositioning the Liquor Sector for Innovative Regulation. Responsibility in Practice and Inclusive Growth.
            </p>
          </div>

          <h1 className="mt-8 font-display font-black uppercase leading-[0.9] text-4xl sm:text-6xl lg:text-7xl text-[#1b3461]">
            KZN
            <br />
            Liquor Indaba
          </h1>

          <div className="w-20 h-1.5 bg-[#CC0000] mt-8" />

          <div className="mt-6 text-sm text-[#6b7280] space-y-1">
            <p>8th &amp; 9th May 2026</p>
            <p>Sibaya Casino, eThekwini</p>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Seconds', value: timeLeft.seconds },
            ].map((item) => (
              <div key={item.label} className="border border-[#d1d5db] rounded-md p-3 bg-white text-center">
                <p className="font-display font-black text-2xl text-[#1b3461]">
                  {pad(item.value)}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#CC0000]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={onRegisterClick}
              className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center bg-[#1a1a1a] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest rounded-md hover:bg-[#1b3461] transition-colors touch-manipulation"
            >
              Register Now
            </button>
            <a
              href={programmeFileHref}
              onClick={(e) => {
                e.preventDefault();
                setPdfPreviewFailed(false);
                setPdfPreview('programme');
              }}
              className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center bg-[#1b3461] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest rounded-md hover:bg-[#102e5d] transition-colors touch-manipulation text-center"
            >
              Programme
            </a>
            <a
              href={encodeURI(PDF_PREVIEW_CONFIG.accommodation.path)}
              onClick={(e) => {
                e.preventDefault();
                setPdfPreviewFailed(false);
                setPdfPreview('accommodation');
              }}
              className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center bg-[#1b3461] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest rounded-md hover:bg-[#102e5d] transition-colors touch-manipulation text-center"
            >
              Accommodation
            </a>
          </div>
        </div>

        <div className="relative min-h-[280px] sm:min-h-[380px] lg:min-h-full overflow-hidden">
          {HERO_IMAGES.map((image, index) => (
            <img
              key={image}
              src={image}
              alt="KZN Indaba visual"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                index === activeImage ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
        </div>
      </section>

      {pdfPreview ? (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="w-full max-w-4xl max-h-[100dvh] sm:max-h-[92dvh] rounded-t-2xl sm:rounded-2xl border border-[#1b3461]/20 bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#1b3461] px-4 sm:px-5 py-3 sm:py-4 flex items-start sm:items-center justify-between gap-3 shrink-0">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#CC0000]">
                  {PDF_PREVIEW_CONFIG[pdfPreview].eyebrow}
                </p>
                <h3 className="text-base sm:text-lg font-display font-black uppercase text-white leading-tight break-words mt-1">
                  {PDF_PREVIEW_CONFIG[pdfPreview].title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPdfPreview(null)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/30 text-xl text-white hover:bg-white/10 transition-colors touch-manipulation"
                aria-label="Close document preview"
              >
                ×
              </button>
            </div>
            <div className="bg-[#f7f7f5] p-3 sm:p-6 overflow-y-auto flex flex-col flex-1 min-h-0">
              {pdfPreviewFailed ? (
                <div className="rounded-xl border border-[#d1d5db] bg-white overflow-hidden shadow-sm p-6 text-center">
                  <p className="text-sm font-semibold text-[#1b3461]">
                    {PDF_PREVIEW_CONFIG[pdfPreview].failMessage}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#d1d5db] bg-white overflow-hidden shadow-sm flex-1 min-h-[45vh] sm:min-h-[320px]">
                  <iframe
                    key={pdfPreview}
                    src={encodeURI(PDF_PREVIEW_CONFIG[pdfPreview].path)}
                    width="100%"
                    height="100%"
                    className="min-h-[45vh] sm:min-h-[500px] w-full"
                    style={{ border: 'none' }}
                    title={PDF_PREVIEW_CONFIG[pdfPreview].iframeTitle}
                    onError={() => setPdfPreviewFailed(true)}
                  />
                </div>
              )}
              <div className="mt-4 flex flex-col-reverse sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-3 shrink-0">
                <a
                  href={encodeURI(PDF_PREVIEW_CONFIG[pdfPreview].path)}
                  download={PDF_PREVIEW_CONFIG[pdfPreview].downloadFilename}
                  className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center bg-[#CC0000] text-white px-6 py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-[#990000] transition-colors touch-manipulation text-center"
                >
                  {PDF_PREVIEW_CONFIG[pdfPreview].downloadLabel}
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <p className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 text-sm text-[#1a1a1a] leading-relaxed break-words">
        The following attendance packages are subject to payment. The Indaba Pass costs R500, the
        Gala Dinner Pass costs R600, and the Indaba Combo Pass costs R900. Members of the Liquor
        Trader Association will get complementary access to the Indaba and receive a discounted rate of R300 for the Gala Dinner through the relevant Association.
      </p>

      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#CC0000]">
              Background &amp; Rationale
            </p>
            <h2 className="mt-3 font-display font-black text-4xl md:text-5xl text-[#1b3461] uppercase leading-tight">
              Why Regulate Liquor in KZN?
            </h2>
            <p className="mt-6 text-[#1a1a1a] leading-relaxed">
              KwaZulu-Natal faces profound challenges in its liquor regulatory landscape. The
              KZN Liquor Regulatory Indaba brings together government, industry, and community
              stakeholders to chart a path forward.
            </p>
            <ul className="mt-6 space-y-3 text-[#1a1a1a]">
              <li>Streamline liquor licensing and eliminate unlicensed trade</li>
              <li>Enable stakeholder deal-making and regulatory engagements</li>
              <li>Promote KZN as a model of responsible liquor governance</li>
              <li>Strengthen community-centred compliance frameworks</li>
            </ul>
          </div>

          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            <img src="/k11.png" alt="KZN Stakeholder Engagement" className="w-full h-[460px] object-cover" />
            <div className="absolute inset-0 bg-[#1b3461]/30" />
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#05111f]/80 to-transparent" />
            <div className="absolute bottom-5 left-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">KZN Liquor Authority</p>
              <p className="text-sm">Stakeholder Engagement</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#1b3461] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#CC0000]">
            Focus Areas
          </p>
          <h2 className="mt-3 font-display font-black text-4xl md:text-6xl text-white uppercase leading-none">
            Priority Regulatory Agenda
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AGENDA_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className={`bg-[#0e1f3d] text-white rounded-2xl border border-white/20 p-6 ${
                    card.highlight ? 'border-l-4 border-l-[#CC0000]' : ''
                  }`}
                >
                  <Icon className="w-7 h-7 text-[#CC0000]" />
                  <h3 className="mt-4 font-display font-bold uppercase text-lg">{card.title}</h3>
                  <ul className="mt-4 space-y-2 text-sm text-zinc-100">
                    {card.points.map((point) => (
                      <li key={point}>- {point}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#CC0000]">
            Scan To Register
          </p>
          <h2 className="mt-3 font-display font-black text-4xl md:text-5xl text-[#1b3461] uppercase">
            Join The Indaba
          </h2>
          <p className="mt-3 text-[#6b7280]">Scan this QR code to register for the event</p>

          <div className="mt-8 inline-flex bg-white border border-zinc-200 shadow-xl rounded-2xl p-6">
            <QRCodeSVG
              id="kzn-qr-svg"
              value={qrValue}
              size={220}
              fgColor="#1a1a2e"
              bgColor="#ffffff"
              level="H"
              includeMargin
            />
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={downloadQrCode}
              className="inline-flex items-center justify-center bg-[#1b3461] text-white px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-[#0e1f3d] transition-colors"
            >
              Download QR Code
            </button>
            <button
              type="button"
              onClick={onRegisterClick}
              className="inline-flex items-center justify-center bg-[#CC0000] text-white px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-[#990000] transition-colors"
            >
              Open Registration Form
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-[#0e1f3d] text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="font-display font-black text-3xl uppercase">Contact Us</h3>
            <div className="mt-6 space-y-2 text-sm text-zinc-200 leading-relaxed">
              <p>Phone (Durban): 031 302 0600</p>
              <p>Phone (PMB): +27 33 345 2714</p>
              <p>Email: info@kznera.org.za</p>
              <p>Website: https://www.kznera.org.za</p>
              <p>
                Durban Office: 1st Floor, Marine Building, 22 Dorothy Nyembe Street, Durban,
                4001
              </p>
              <p>
                PMB Office: 01 George MacFarlane Lane, Wembley, Pietermaritzburg, 3201
              </p>
              <p className="pt-2 text-zinc-300">
                Note: KZNERA is the official regulatory authority for liquor, gaming and betting in
                KwaZulu-Natal.
              </p>
            </div>
          </div>
          <div className="bg-[#05111f] rounded-2xl p-8 border border-white/10">
            <h3 className="font-display font-black text-3xl uppercase">Ready to Register?</h3>
            <p className="mt-4 text-sm text-zinc-200 leading-relaxed">
              Join us in Durban this May for a landmark regulatory dialogue shaping the future of
              KZN&apos;s liquor industry.
            </p>
            <button
              type="button"
              onClick={onRegisterClick}
              className="mt-8 inline-flex items-center justify-center bg-[#CC0000] text-white px-8 py-4 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-[#990000] transition-colors"
            >
              Secure Your Delegate Spot
            </button>
          </div>
        </div>
        <div className="bg-[#05111f]">
          <div className="max-w-7xl mx-auto px-6 py-4 text-xs text-zinc-300">
            © 2026 KZN Liquor Authority | KwaZulu-Natal Economic Regulatory Authority. All rights
            reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
