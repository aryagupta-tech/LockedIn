import { LandingPage } from "@/components/landing-page";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "LockedIn",
  alternateName: "LockedIn Social",
  url: "https://localhost:3000",
  description: "Only the locked-in get in.",
  publisher: {
    "@type": "Organization",
    name: "LockedIn"
  },
  potentialAction: {
    "@type": "JoinAction",
    name: "Apply to LockedIn",
    target: "https://localhost:3000/#apply"
  }
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd)
        }}
      />
      <LandingPage />
    </>
  );
}
