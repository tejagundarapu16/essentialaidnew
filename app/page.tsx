import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  ClipboardList,
  MapPin,
  PackageCheck,
  Search,
  Siren,
  Sparkles,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MarketingHeader } from "@/components/marketing-header"
import { ROLE_META, ROLE_ORDER } from "@/lib/roles"

const STEPS = [
  {
    icon: ClipboardList,
    title: "List or request",
    body: "Donors list surplus essentials; recipients request what they need with an urgency level.",
  },
  {
    icon: Search,
    title: "Smart matching",
    body: "Our algorithm pairs donations to requests by category, distance, and urgency priority.",
  },
  {
    icon: PackageCheck,
    title: "Track to delivery",
    body: "Follow every item through six stages, from verified to delivered, in real time.",
  },
]

const STATS = [
  { value: "12,400+", label: "Items delivered" },
  { value: "98%", label: "Match success rate" },
  { value: "2 active", label: "Emergency drives" },
  { value: "< 6 hrs", label: "Avg. critical response" },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
            <div className="flex flex-col gap-6">
              <Badge variant="success" className="w-fit">
                <Sparkles className="size-3" /> Coordinated relief, delivered faster
              </Badge>
              <h1 className="text-balance font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Get essential supplies to the people who need them most
              </h1>
              <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
                EssentialAid connects donors, recipients, and logistics teams on one platform, with
                smart matching, live tracking, and rapid emergency drives when crisis strikes.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/login">
                  <Button size="lg">
                    Enter the platform <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <a href="#how">
                  <Button size="lg" variant="outline">
                    See how it works
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex -space-x-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary/15 text-[10px] font-medium text-primary"
                    >
                      <Star className="size-3 fill-primary text-primary" />
                    </span>
                  ))}
                </span>
                Trusted by relief teams coordinating thousands of deliveries
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-border shadow-xl">
                <Image
                  src="/hero-aid.png"
                  alt="Volunteers organizing boxes of essential supplies at a community relief center"
                  width={720}
                  height={560}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
              <Card className="absolute -bottom-5 -left-4 w-52 gap-2 py-3 shadow-lg">
                <CardContent className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-critical/12 text-critical">
                    <Siren className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-none">Flood Relief</p>
                    <p className="mt-1 text-xs text-muted-foreground">Critical drive active</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center text-center">
                <span className="font-serif text-3xl font-semibold text-primary">{s.value}</span>
                <span className="mt-1 text-sm text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance font-serif text-3xl font-semibold tracking-tight">
              From surplus to delivered, in three steps
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              A transparent supply chain built for speed, dignity, and accountability.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Card key={step.title} className="relative">
                <CardContent className="flex flex-col gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <step.icon className="size-5" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance font-serif text-3xl font-semibold tracking-tight">
                One platform, built for everyone in the chain
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Purpose-built portals for each role keep the whole operation coordinated.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ROLE_ORDER.map((role) => {
                const meta = ROLE_META[role]
                return (
                  <Card key={role}>
                    <CardContent className="flex flex-col gap-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <meta.icon className="size-5" />
                      </span>
                      <h3 className="text-lg font-semibold">{meta.short}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {meta.description}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Emergency drives CTA */}
        <section id="drives" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <Card className="overflow-hidden border-critical/30 bg-critical/5">
            <CardContent className="flex flex-col items-start gap-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-critical/12 text-critical">
                  <Siren className="size-6" />
                </span>
                <div>
                  <h2 className="font-serif text-2xl font-semibold tracking-tight">
                    Emergency drives, activated in minutes
                  </h2>
                  <p className="mt-2 max-w-xl text-pretty text-muted-foreground">
                    When disaster strikes, admins launch a drive that spotlights urgent needs
                    platform-wide and fast-tracks matching for critical items.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4" /> Currently active in Kerr &amp; Travis County, TX
                  </div>
                </div>
              </div>
              <Link href="/login">
                <Button size="lg">
                  Join a drive <ArrowRight className="size-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} EssentialAid. Built for coordinated humanitarian relief.</p>
          <p>A demonstration platform.</p>
        </div>
      </footer>
    </div>
  )
}
