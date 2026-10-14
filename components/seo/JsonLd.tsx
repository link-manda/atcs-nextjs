export function JsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://atcs.andhira-tech.my.id/#website',
        url: 'https://atcs.andhira-tech.my.id',
        name: 'CCTV ATCS Bali — Pantau Macet & SPBU Real-Time',
        description:
          'Sistem pemantau siaran langsung kamera CCTV ATCS se-Bali, cek antrean SPBU, dan kondisi kemacetan lalu lintas real-time.',
        inLanguage: 'id-ID',
      },
      {
        '@type': 'WebApplication',
        '@id': 'https://atcs.andhira-tech.my.id/#webapp',
        name: 'Bali Command Center ATCS Next',
        url: 'https://atcs.andhira-tech.my.id',
        applicationCategory: 'TrafficApplication',
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'IDR',
        },
        areaServed: {
          '@type': 'AdministrativeArea',
          name: 'Bali, Indonesia',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
