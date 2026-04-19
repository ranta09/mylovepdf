import { Helmet } from "react-helmet-async";

const BASE_URL = "https://magicdocx.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

interface SEOHeadProps {
  /** Full page title, e.g. "PDF to Word Converter, Free, Fast, No Signup | MagicDOCX" */
  title: string;
  /** Meta description, max 160 characters */
  description: string;
  /** Canonical path or full URL, e.g. "/pdf-to-word" or "https://magicdocx.com/pdf-to-word" */
  canonicalUrl?: string;
  /** Absolute URL to the OG image */
  ogImage?: string;
  /** Page type for OG protocol (default: "website") */
  ogType?: string;
  /** Optional JSON-LD structured data objects to inject as <script> tags */
  jsonLd?: object[];
}

const SEOHead = ({
  title,
  description,
  canonicalUrl,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  jsonLd,
}: SEOHeadProps) => {
  const canonical = canonicalUrl
    ? canonicalUrl.startsWith("http")
      ? canonicalUrl
      : `${BASE_URL}${canonicalUrl}`
    : undefined;

  return (
    <Helmet>
      {/* Primary */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="MagicDOCX" />

      {/* Twitter / X Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {jsonLd && jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOHead;
