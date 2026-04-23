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

const HERO_IMAGES = ['/bartender-bg.jpg', '/hero-bg.jpg', '/third.png'];
const TARGET_DATE = new Date('2026-05-08T00:00:00+02:00');

const LEADERS = [
  {
    image: '/musa_zondi.png',
    name: 'Rev. Musa Zondi',
    role: 'MEC: Economic Development, Tourism & Environmental Affairs',
    quote:
      "KZNERA will regulate and empower our province's gambling and liquor industries...",
    border: 'border-[#1b3461]',
  },
  {
    image: '/mbali_myeni.png',
    name: 'Ms Mbali Myeni',
    role: 'Board Chairperson, KZNERA',
    quote:
      'Our industry contributes enormously to the provincial economy...',
    border: 'border-[#D4860A]',
  },
  {
    image: '/portia_baloyi.png',
    name: 'Ms Portia Baloyi',
    role: 'Interim Chief Executive Officer, KZNERA',
    quote:
      'The KZN Liquor Regulatory Indaba marks a significant milestone...',
    border: 'border-[#1b3461]',
  },
];

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
      'Liquor Indaba 2026 — Durban ICC',
      'Industry deal-making & regulatory dialogue',
      'Traditional leadership & community forums',
      'Inter-governmental compliance partnerships',
    ],
    highlight: false,
  },
];

const PARTNERS = [
  '/images/partners/kznedtea.png',
  '/images/partners/saps.svg',
  '/images/partners/dept-health-kzn.png',
  '/images/partners/dept-transport-kzn.png',
  '/images/partners/dalrrd.png',
  '/images/partners/kzn-treasury.png',
  '/images/partners/basa.png',
  '/images/partners/salba.png',
  '/images/partners/heineken.png',
  '/images/partners/kzntafa.png',
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

export default function KznLandingPage({ onRegisterClick }: KznLandingPageProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [timeLeft, setTimeLeft] = useState(getTimeParts);

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
      <section className="grid grid-cols-1 lg:grid-cols-[56%_44%] min-h-[90vh]">
        <div className="bg-white px-6 sm:px-10 lg:px-14 py-10 flex flex-col justify-center">
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
              Regulating for Responsible Trade: Building a Safer KZN Together
            </p>
          </div>

          <h1 className="mt-8 font-display font-black uppercase leading-[0.9] text-4xl sm:text-6xl lg:text-7xl text-[#1b3461]">
            Liquor
            <br />
            Regulatory
            <br />
            <span className="text-[#D4860A]">Indaba 2026</span>
          </h1>

          <div className="w-20 h-1.5 bg-[#D4860A] mt-8" />

          <div className="mt-6 text-sm text-[#6b7280] space-y-1">
            <p>8th &amp; 9th May 2026</p>
            <p>Durban ICC, KwaZulu-Natal</p>
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4860A]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onRegisterClick}
            className="mt-8 inline-flex items-center justify-center bg-[#1a1a1a] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest rounded-md hover:bg-[#1b3461] transition-colors w-fit"
          >
            Register Now
          </button>
          <p className="mt-4 max-w-xl text-sm text-[#1a1a1a] leading-relaxed">
            The following attendance packages are subject to payment. The Indaba Pass costs R500,
            the Gala Dinner Pass costs R600, and the Indaba Combo Pass costs R900. Members of the
            Liquor Trader Association receive a discounted rate of R300 for the Gala Dinner.
          </p>
        </div>

        <div className="relative min-h-[420px] lg:min-h-full overflow-hidden">
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

      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#D4860A]">
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

      <section className="bg-[#f7f7f5] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#D4860A] text-center">
            Leadership
          </p>
          <h2 className="mt-3 font-display font-black text-4xl md:text-5xl text-[#1b3461] uppercase text-center">
            Welcome Messages
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {LEADERS.map((leader) => (
              <article key={leader.name} className="bg-white rounded-2xl shadow-md border border-zinc-200 p-7 text-center">
                <img
                  src={leader.image}
                  alt={leader.name}
                  className={`h-24 w-24 rounded-full object-cover object-top border-4 ${leader.border} mx-auto`}
                />
                <h3 className="mt-5 font-display font-black text-xl text-[#1b3461]">{leader.name}</h3>
                <p className="mt-2 text-sm text-[#6b7280]">{leader.role}</p>
                <p className="mt-4 text-sm text-[#1a1a1a] italic">"{leader.quote}"</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#1b3461] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#D4860A]">
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
                    card.highlight ? 'border-l-4 border-l-[#D4860A]' : ''
                  }`}
                >
                  <Icon className="w-7 h-7 text-[#D4860A]" />
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#D4860A]">
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
              className="inline-flex items-center justify-center bg-[#D4860A] text-white px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-[#b87408] transition-colors"
            >
              Open Registration Form
            </button>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f7f5] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#D4860A] text-center">
            Collaborators
          </p>
          <h2 className="mt-3 font-display font-black text-4xl md:text-5xl text-[#1b3461] uppercase text-center">
            Our Partners
          </h2>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
            {PARTNERS.map((logo) => (
              <div
                key={logo}
                className="bg-white rounded-xl border border-zinc-200 shadow-sm hover:-translate-y-0.5 transition-transform p-5 flex items-center justify-center"
              >
                <img src={logo} alt="Partner logo" className="max-h-12 w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#0e1f3d] text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="font-display font-black text-3xl uppercase">Contact Us</h3>
            <div className="mt-6 space-y-2 text-sm text-zinc-200 leading-relaxed">
              <p>Phone (Durban): +27 31 583 1800</p>
              <p>Phone (PMB): +27 33 345 2714</p>
              <p>Email: info@kznera.org.za</p>
              <p>Website: https://www.kznera.org.za</p>
              <p>
                Durban Office: 18th Floor, Marine Building, 22 Dorothy Nyembe Street, Durban,
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
              className="mt-8 inline-flex items-center justify-center bg-[#D4860A] text-white px-8 py-4 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-[#b87408] transition-colors"
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
