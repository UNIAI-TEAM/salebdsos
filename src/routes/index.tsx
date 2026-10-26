import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Users2, BarChart3, QrCode, Brain, Smartphone, MessageSquare, ShieldCheck, FileText, Layers, Calendar, Check, Plus, Handshake, Contact, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { landingContent as copy } from "@/lib/landing-content";
import residentialImage from "@/assets/salebds-residential.jpg";

const SITE_URL = "https://salebdsos.lovable.app";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: copy.title },
      { name: "description", content: copy.description },
      { property: "og:title", content: copy.title },
      { property: "og:description", content: copy.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({
      "@context": "https://schema.org", "@type": "SoftwareApplication", name: copy.hero.name,
      applicationCategory: "BusinessApplication", operatingSystem: "Web", url: SITE_URL, description: copy.description,
    }) }, { type: "application/ld+json", children: JSON.stringify({
      "@context": "https://schema.org", "@type": "FAQPage", mainEntity: copy.faq.map(({q,a}) => ({
        "@type": "Question", name:q, acceptedAnswer:{"@type":"Answer",text:a},
      })),
    }) }],
  }),
  component: LandingPage,
});

const featureIcons = [Building2, Handshake, Contact, Workflow, Users2, Layers, BarChart3, MessageSquare, FileText, BarChart3, ShieldCheck];
const workflowIcons = [QrCode, Users2, Calendar, FileText];
const agencyIcons = [Handshake, Building2, Users2, BarChart3];
const digitalCardIcons = [QrCode, Building2, Users2, ShieldCheck];
const scriptIcons = [Workflow, Smartphone, MessageSquare, Users2];
const aiIcons = [Brain, MessageSquare, Building2];
const mobileIcons = [BarChart3, Smartphone, QrCode];

function SectionHeading({eyebrow,title,description}:{eyebrow:string;title:string;description?:string}) {
  return <div className="max-w-2xl">
    <p className="mb-3 text-sm font-semibold text-primary">{eyebrow}</p>
    <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{title}</h2>
    {description && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>}
  </div>;
}
function Band({id,muted=false,children}:{id?:string;muted?:boolean;children:ReactNode}) {
  return <section id={id} className={`scroll-mt-24 border-b border-border py-14 sm:py-20 ${muted ? "bg-muted/40" : "bg-background"}`}>
    <div className="mx-auto max-w-6xl px-5 sm:px-8">{children}</div>
  </section>;
}
function LandingPage() {
  return <div className="salebds-landing bg-background text-foreground">
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-18 max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 font-semibold">
          <Building2 className="h-6 w-6 text-primary" />{copy.hero.name}
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
          {copy.nav.map(item => <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">{item.label}</a>)}
        </nav>
        <Button asChild size="sm"><Link to="/dashboard">{copy.hero.login}<ArrowRight className="h-4 w-4" /></Link></Button>
      </div>
    </header>
    <main>
      <section className="relative isolate overflow-hidden">
        <img src={residentialImage} alt="" width={1600} height={912} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-right" />
        <div className="landing-photo-wash absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-primary">{copy.hero.eyebrow}</p>
            <h1 className="mt-5 text-5xl font-semibold leading-tight sm:text-6xl">{copy.hero.name}</h1>
            <p className="mt-4 text-2xl font-medium leading-snug sm:text-3xl">{copy.hero.subtitle}</p>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{copy.hero.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/dashboard">{copy.hero.login}<ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><a href="#features">{copy.hero.discover}</a></Button>
            </div>
          </div>
        </div>
      </section>
      <div className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {copy.hero.priorities.map(item => <div key={item} className="flex items-center gap-3 text-sm font-medium"><Check className="h-4 w-4 shrink-0 text-primary" />{item}</div>)}
        </div>
      </div>
      <Band id="features">
        <SectionHeading {...copy.features} />
        <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {copy.features.items.map((item,i) => {
            const Icon = featureIcons[i] ?? Building2;
            return <article key={item.title} className="border-t border-border pt-5">
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </article>;
          })}
        </div>
      </Band>
      <Band id="agencies" muted>
        <SectionHeading {...copy.agencies} />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {copy.agencies.items.map((item,i) => {
            const Icon = agencyIcons[i] ?? Handshake;
            return <article key={item.title} className="rounded-lg border border-border bg-background p-5">
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </article>;
          })}
        </div>
      </Band>
      <Band id="digital-card">
        <SectionHeading {...copy.digitalCard} />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {copy.digitalCard.items.map((item,i) => {
            const Icon = digitalCardIcons[i] ?? QrCode;
            return <article key={item.title} className="border-t border-border pt-5">
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </article>;
          })}
        </div>
      </Band>
      <Band id="scripts" muted>
        <SectionHeading {...copy.scripts} />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {copy.scripts.items.map((item,i) => {
            const Icon = scriptIcons[i] ?? Workflow;
            return <article key={item.title} className="rounded-lg border border-border bg-background p-5">
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </article>;
          })}
        </div>
      </Band>
      <Band id="platform" muted>
        <SectionHeading {...copy.workflow} />
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {copy.workflow.steps.map((item,i) => {
            const Icon=workflowIcons[i] ?? FileText;
            return <li key={item.title}>
              <div className="mb-5 flex items-center gap-3"><span className="text-3xl font-semibold text-primary/50">{String(i+1).padStart(2,"0")}</span><div className="h-px flex-1 bg-border" /><Icon className="h-5 w-5 text-primary" /></div>
              <h3 className="text-base font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </li>;
          })}
        </ol>
      </Band>
      <Band id="ai">
        <SectionHeading {...copy.ai} />
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">{copy.ai.items.map((item,i)=>{
            const Icon=aiIcons[i] ?? Brain;
            return <div key={item.title} className="flex gap-4"><Icon className="mt-1 h-5 w-5 shrink-0 text-primary" /><div><h3 className="text-base font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p></div></div>;
          })}</div>
          <div className="border-l-2 border-primary/30 pl-6">
            <p className="mb-4 text-sm font-medium text-muted-foreground">{copy.ai.exampleLabel}</p>
            {copy.ai.questions.map(q=><p key={q} className="flex items-start gap-3 border-t border-border py-4 text-base"><MessageSquare className="mt-1 h-4 w-4 shrink-0 text-primary" />{q}</p>)}
          </div>
        </div>
      </Band>
      <Band id="mobile" muted>
        <SectionHeading {...copy.mobile} />
        <div className="mt-10 grid gap-8 sm:grid-cols-3">{copy.mobile.items.map((item,i)=>{
          const Icon=mobileIcons[i] ?? Smartphone;
          return <div key={item.title}><Icon className="mb-4 h-6 w-6 text-primary" /><h3 className="text-base font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p></div>;
        })}</div>
        <p className="mt-8 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">{copy.mobile.notice}</p>
      </Band>
      <Band id="connections">
        <SectionHeading {...copy.connections} />
        <div className="mt-10 grid gap-6 sm:grid-cols-2">{copy.connections.items.map(item=><article key={item.title} className="rounded-lg border border-border p-5"><h3 className="text-base font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p></article>)}</div>
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{copy.connections.pending}</p>
      </Band>
      <Band id="audience" muted>
        <SectionHeading {...copy.audience} />
        <div className="mt-10 grid gap-8 sm:grid-cols-3">{copy.audience.items.map(item=><article key={item.title}><h3 className="text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p></article>)}</div>
      </Band>
      <Band id="faq">
        <SectionHeading eyebrow={copy.nav[4].label} title={copy.faqHeading} />
        <div className="mt-8 max-w-3xl divide-y divide-border">{copy.faq.map((item,i)=><details key={item.q} open={i===0} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-medium"><span>{item.q}</span><Plus className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" /></summary>
          <p className="mt-3 pr-8 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
        </details>)}</div>
      </Band>
      <Band muted>
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-xl"><h2 className="text-3xl font-semibold leading-tight">{copy.cta.title}</h2><p className="mt-4 text-base leading-relaxed text-muted-foreground">{copy.cta.description}</p></div>
          <div className="flex shrink-0 flex-wrap gap-3"><Button asChild size="lg"><Link to="/dashboard">{copy.cta.button}<ArrowRight className="h-4 w-4" /></Link></Button><Button asChild variant="outline" size="lg"><Link to="/digital-card">{copy.cta.secondary}</Link></Button></div>
        </div>
      </Band>
    </main>
    <footer className="bg-background">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-5 py-8 sm:flex-row sm:px-8">
        <div><p className="font-semibold">{copy.hero.name}</p><p className="mt-2 text-sm text-muted-foreground">{copy.footer.tagline}</p></div>
        <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground"><a href="#features">{copy.nav[0].label}</a><a href="#faq">{copy.nav[4].label}</a><span>{copy.footer.copyright}</span></div>
      </div>
    </footer>
  </div>;
}
