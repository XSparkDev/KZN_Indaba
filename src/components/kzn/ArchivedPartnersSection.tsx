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

export function ArchivedPartnersSection() {
  return (
    <section className="bg-[#f7f7f5] py-20">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#CC0000] text-center">
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
  );
}
