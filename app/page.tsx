'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, ArrowRight, BarChart3, Bell, Check, ChevronDown, ClipboardCheck, FileText, LayoutDashboard, LockKeyhole, Menu, Search, Settings, ShieldCheck, Stethoscope, UserRound, Users, X, Mail, Phone, BookOpen, TrendingUp, Upload, Download, Eye, EyeOff, Layers, LogIn, UserPlus, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SiteFooter } from '@/components/footer'
import { ThemeToggle } from '@/components/theme-toggle'
import { AuthView } from '@/components/auth-view'

type View = 'home' | 'contact' | 'auth' | 'examiner' | 'results' | 'admin'
type Role = 'examiner' | 'student' | 'admin'
type Score = 'pass' | 'borderline' | 'fail' | null

const candidateSeed = [
  { name: 'Amara Okafor', id: 'MED-2024-0087', station: 'Cardiology', status: 'In progress', initials: 'AO', score: '—' },
  { name: 'Daniel Chen', id: 'MED-2024-0091', station: 'Respiratory', status: 'Completed', initials: 'DC', score: '82%' },
  { name: 'Sofia Martinez', id: 'MED-2024-0102', station: 'Neurology', status: 'Not started', initials: 'SM', score: '—' },
  { name: 'James Wilson', id: 'MED-2024-0108', station: 'Abdominal', status: 'Completed', initials: 'JW', score: '74%' },
]
const criteria = ['Introduces self and confirms patient identity', 'Explores presenting complaint using open questions', 'Performs focused cardiovascular examination', 'Explains findings and offers a clear plan']

export default function Page() {
  const [view, setView] = useState<View>('home')
  const [role, setRole] = useState<Role>('examiner')
  const [mobileNav, setMobileNav] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState(0)
  const [scores, setScores] = useState<Score[]>([null, null, null, null])
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login')
  const [weights, setWeights] = useState([25, 25, 25, 25])
  const filtered = useMemo(() => candidateSeed.filter((c) => `${c.name} ${c.id}`.toLowerCase().includes(search.toLowerCase())), [search])
  const total = scores.every(Boolean) ? scores.reduce((sum, score) => sum + (score === 'pass' ? 25 : score === 'borderline' ? 15 : 5), 0) : 0
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2200) }

  useEffect(() => {
    const syncViewFromUrl = () => {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      const urlView = params.get('view') as View
      if (urlView && ['home', 'contact', 'examiner', 'results', 'admin'].includes(urlView)) {
        setView(urlView)
      }
    }
    syncViewFromUrl()
    window.addEventListener('popstate', syncViewFromUrl)
    return () => window.removeEventListener('popstate', syncViewFromUrl)
  }, [])

  const navigate = (next: View) => {
    setView(next)
    setMobileNav(false)
    if (typeof window !== 'undefined') {
      if (next === 'home') {
        window.history.pushState({}, '', '/')
      } else {
        window.history.pushState({}, '', `/?view=${next}`)
      }
    }
  }

  const openWorkspace = (nextRole: Role) => { setRole(nextRole); navigate(nextRole === 'examiner' ? 'examiner' : nextRole === 'student' ? 'results' : 'admin') }

  return <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
    {view === 'home' || view === 'contact' || view === 'auth' ? <MarketingHeader navigate={navigate} /> : <WorkspaceHeader view={view} navigate={navigate} mobileNav={mobileNav} setMobileNav={setMobileNav} />}
    {view === 'home' && <Landing navigate={navigate} openWorkspace={openWorkspace} />}

    {view === 'contact' && <Contact navigate={navigate} notify={notify} />}
    {view === 'auth' && <Auth mode={loginMode} setMode={setLoginMode} openWorkspace={openWorkspace} />}
    {view === 'examiner' && <Examiner candidates={filtered} selectedCandidate={selectedCandidate} setSelectedCandidate={setSelectedCandidate} search={search} setSearch={setSearch} scores={scores} setScores={setScores} total={total} onSave={() => notify('Draft saved locally')} onSubmit={() => setShowPin(true)} />}
    {view === 'results' && <Results notify={notify} />}
    {view === 'admin' && <Admin search={search} setSearch={setSearch} weights={weights} setWeights={setWeights} notify={notify} />}
    {(view === 'home' || view === 'contact') && <Footer navigate={navigate} />}
    {showPin && <PinModal close={() => setShowPin(false)} submit={() => { setShowPin(false); notify('Assessment submitted successfully') }} />}
    {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg">{toast}</div>}
  </div>
}

function Logo({ light = false }: { light?: boolean }) { return <span className={`flex items-center gap-2 text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900 dark:text-white'}`}><span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm"><Activity className="size-5" /></span>NEW ERA <span className="text-blue-600 dark:text-blue-400">ECOS</span></span> }

function MarketingHeader({ navigate }: { navigate: (v: View) => void }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" onClick={() => navigate('home')} className="focus:outline-none">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => navigate('home')}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <Layers className="size-4" />
            Platform
          </button>
          <button
            onClick={() => navigate('contact')}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <Mail className="size-4" />
            Contact
          </button>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <LogIn className="size-4" />
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md hover:shadow-blue-500/25 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <UserPlus className="size-4" />
            Sign up
          </Link>
        </div>
      </div>
    </header>
  )
}


function WorkspaceHeader({ view, navigate, mobileNav, setMobileNav }: any) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => navigate('home')} className="focus:outline-none">
          <Logo />
        </button>
        <nav className={`${mobileNav ? 'flex' : 'hidden'} absolute left-0 right-0 top-16 z-20 flex-col gap-1 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 lg:static lg:flex lg:flex-row lg:border-0 lg:bg-transparent lg:p-0`}>
          <NavItem icon={LayoutDashboard} label="Overview" active={false} onClick={() => navigate('home')} />
          <NavItem icon={ClipboardCheck} label="Examiner station" active={view === 'examiner'} onClick={() => navigate('examiner')} />
          <NavItem icon={BarChart3} label="Student results" active={view === 'results'} onClick={() => navigate('results')} />
          <NavItem icon={Settings} label="Admin" active={view === 'admin'} onClick={() => navigate('admin')} />
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button aria-label="Notifications" className="hidden rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 sm:block">
            <Bell className="size-5" />
          </button>
          <div className="hidden items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-3 sm:flex">
            <span className="flex size-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold">JD</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Dr. Jordan Davis</span>
            <ChevronDown className="size-4 text-slate-400" />
          </div>
          <button aria-label="Toggle navigation" className="rounded-lg p-2 text-slate-600 dark:text-slate-300 lg:hidden" onClick={() => setMobileNav(!mobileNav)}>
            <Menu className="size-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

function NavItem({ icon: Icon, label, active, onClick }: any) { return <button onClick={onClick} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4" />{label}</button> }

function Landing({ navigate, openWorkspace }: any) {
  return (
    <main>
      <section className="overflow-hidden bg-slate-50 dark:bg-slate-900/90 px-5 py-20 text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
              <ShieldCheck className="size-3.5 text-blue-600 dark:text-blue-400" />
              Built for modern medical education
            </div>
            <h1 className="max-w-2xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl text-slate-900 dark:text-white">
              Assess with confidence. <span className="text-blue-600 dark:text-blue-400">Learn with clarity.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-600 dark:text-slate-300">
              A calm, connected workspace for OSCE examiners, students, and administrators. Make every assessment fair, fast, and useful.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button
                onClick={() => openWorkspace('examiner')}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md hover:shadow-blue-500/20 px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2"
              >
                Open examiner station
                <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() => navigate('results')}
                className="px-5 py-2.5 rounded-xl font-medium text-sm transition-colors bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-white flex items-center gap-2"
              >
                View student results
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/60 backdrop-blur-md p-4 shadow-2xl">
            <div className="rounded-xl bg-white dark:bg-slate-900 p-5 text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">Live assessment</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Station 04 · Cardiology</h2>
                </div>
                <span className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">In progress</span>
              </div>
              <div className="flex items-center gap-3 py-5">
                <span className="flex size-11 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-semibold">AO</span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Amara Okafor</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">MED-2024-0087</p>
                </div>
              </div>
              {['Communication & rapport', 'Clinical examination', 'Clinical reasoning'].map((x, i) => (
                <div key={x} className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 py-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{x}</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{[86, 74, 71][i]}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">One platform, every perspective</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">A better assessment day starts here.</h2>
          <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">Replace scattered spreadsheets and delayed feedback with a shared source of truth for every station.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Feature icon={ClipboardCheck} title="Examiner station" text="Focused rubrics, candidate context, and fast scoring designed for the room." />
          <Feature icon={BookOpen} title="Student clarity" text="Turn results into a practical, encouraging next step for every learner." />
          <Feature icon={TrendingUp} title="Program insight" text="See cohort trends and configure assessments without the admin overhead." />
        </div>
      </section>
      <section className="border-y border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 px-5 py-16 text-center">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Trusted by clinical education teams who care about better feedback</p>
        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-12 gap-y-5 text-lg font-semibold text-slate-700 dark:text-slate-300">
          <span>Northbridge Medical</span>
          <span>Vantage Health</span>
          <span>St. Anne&apos;s</span>
          <span>MedEd Collective</span>
        </div>
      </section>
    </main>
  )
}

function Feature({ icon: Icon, title, text }: any) {
  return (
    <div className="glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 bg-white/70 dark:bg-slate-800/50">
      <span className="mb-5 flex size-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
        <Icon className="size-5" />
      </span>
      <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{text}</p>
    </div>
  )
}


function Auth({ mode, setMode, openWorkspace }: any) {
  return <AuthView initialMode={mode} onSuccess={() => openWorkspace('examiner')} />
}


function Contact({ navigate, notify }: any) { return <main className="mx-auto max-w-6xl px-5 py-16 lg:px-8"><div className="grid gap-14 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Contact our team</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Let&apos;s make assessment clearer.</h1><p className="mt-5 leading-7 text-muted-foreground">Tell us what your program needs. Our team can help you design a smoother assessment day.</p><div className="mt-10 flex flex-col gap-5"><div className="flex gap-3"><Mail className="mt-1 size-5 text-primary" /><div><p className="font-medium">Email us</p><p className="text-sm text-muted-foreground">hello@ne-ecos.com</p></div></div><div className="flex gap-3"><Phone className="mt-1 size-5 text-primary" /><div><p className="font-medium">Talk to support</p><p className="text-sm text-muted-foreground">Mon–Fri, 9:00–17:00</p></div></div></div></div><form className="rounded-2xl border border-border bg-card p-6 shadow-sm" onSubmit={(e) => { e.preventDefault(); notify('Thanks — we will be in touch shortly') }}><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium">First name<input required className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3" /></label><label className="text-sm font-medium">Last name<input required className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3" /></label></div><label className="mt-5 block text-sm font-medium">Work email<input required type="email" className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3" /></label><label className="mt-5 block text-sm font-medium">How can we help?<textarea required rows={5} className="mt-2 w-full rounded-md border border-input bg-background p-3" /></label><Button className="mt-6" type="submit">Send message <ArrowRight data-icon="inline-end" /></Button></form></div></main> }

function Examiner({ candidates, selectedCandidate, setSelectedCandidate, search, setSearch, scores, setScores, total, onSave, onSubmit }: any) { const candidate = candidates[selectedCandidate] || candidateSeed[0]; return <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8"><PageIntro eyebrow="Examiner station" title="Station 04 · Cardiology" description="Assess candidate performance against the station rubric." action={<Button variant="outline" onClick={onSave}><Check data-icon="inline-start" />Save draft</Button>} /><div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]"><aside className="glass-card rounded-3xl border border-white/70 p-4"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Candidates <span className="ml-1 text-xs font-normal text-muted-foreground">({candidates.length})</span></h2><Users className="size-4 text-muted-foreground" /></div><div className="relative mb-4"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><input aria-label="Search candidates" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or ID" className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div><div className="flex flex-col gap-1">{candidates.map((item: any, i: number) => <button key={item.id} onClick={() => setSelectedCandidate(i)} className={`flex items-center gap-3 rounded-lg p-3 text-left ${i === selectedCandidate ? 'bg-primary/10' : 'hover:bg-muted'}`}><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{item.initials}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{item.name}</span><span className="block truncate text-xs text-muted-foreground">{item.id}</span></span><span className={`ml-auto size-2 rounded-full ${item.status === 'Completed' ? 'bg-primary' : item.status === 'In progress' ? 'bg-amber-500' : 'bg-muted-foreground/30'}`} /></button>)}</div></aside><section className="glass-card rounded-3xl border border-white/70 p-6"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">Current candidate</p><h2 className="mt-1 text-2xl font-semibold">{candidate.name}</h2><p className="text-sm text-muted-foreground">{candidate.id} · {candidate.station}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Station score</p><p className="text-3xl font-semibold text-primary">{total}<span className="text-base text-muted-foreground"> / 100</span></p></div></div><div className="mt-6 flex flex-col gap-3">{criteria.map((item, i) => <div key={item} className="rounded-lg border border-border p-4"><div className="flex items-start gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span><p className="text-sm leading-6">{item}</p></div><div className="mt-4 flex gap-2 pl-10">{(['pass', 'borderline', 'fail'] as const).map((score) => <button key={score} onClick={() => setScores((prev: Score[]) => prev.map((x, index) => index === i ? score : x))} className={`rounded-md border px-3 py-1.5 text-xs font-semibold capitalize ${scores[i] === score ? (score === 'pass' ? 'border-primary bg-accent text-accent-foreground' : score === 'fail' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-amber-500 bg-amber-500/10 text-amber-700') : 'border-border text-muted-foreground hover:bg-muted'}`}>{score}</button>)}</div></div>)}</div><div className="mt-6 flex justify-end"><Button disabled={!scores.every(Boolean)} onClick={onSubmit}>Submit assessment <ArrowRight data-icon="inline-end" /></Button></div></section></div></main> }
function PageIntro({ eyebrow, title, description, action }: any) { return <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>{action}</div> }
function Results({ notify }: any) { return <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8"><PageIntro eyebrow="Student results" title="Your assessment results" description="Review your performance and identify your next learning focus." action={<Button variant="outline" onClick={() => notify('Report prepared for download')}><Download data-icon="inline-start" />Export report</Button>} /><div className="mt-8 grid gap-5 md:grid-cols-[1.2fr_.8fr]"><div className="glass-card rounded-3xl border border-white/70 p-6"><div className="flex items-center gap-4"><span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">AO</span><div><h2 className="text-xl font-semibold">Amara Okafor</h2><p className="text-sm text-muted-foreground">MED-2024-0087 · Spring Assessment 2026</p></div></div><div className="mt-8 flex items-end justify-between"><div><p className="text-sm text-muted-foreground">Overall performance</p><p className="mt-1 text-5xl font-semibold text-primary">78<span className="text-lg text-muted-foreground"> / 100</span></p></div><span className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground">Pass</span></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[78%] rounded-full bg-primary" /></div><div className="mt-8 grid gap-3 sm:grid-cols-2">{['Communication & rapport', 'Clinical examination', 'Clinical reasoning', 'Professionalism'].map((item, i) => <div key={item} className="flex items-center justify-between rounded-lg bg-muted/60 p-3"><span className="text-sm">{item}</span><span className="font-semibold">{[86, 74, 71, 89][i]}%</span></div>)}</div></div><div className="rounded-xl border border-border bg-primary p-6 text-primary-foreground"><p className="text-xs font-semibold uppercase tracking-widest text-[#0077b6]">Feedback summary</p><h2 className="mt-3 text-2xl font-semibold">You are building strong clinical presence.</h2><p className="mt-4 text-sm leading-6 text-[#03045e]/70">Your communication and professionalism stood out. Focus your next practice session on structuring the cardiovascular examination.</p><Button className="mt-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90" onClick={() => notify('Practice plan saved')}>Save practice plan</Button></div></div></main> }
function Admin({ search, setSearch, weights, setWeights, notify }: any) { const sum = weights.reduce((a: number, b: number) => a + Number(b), 0); return <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8"><PageIntro eyebrow="Program administration" title="Assessment overview" description="Configure stations, review cohorts, and keep your assessment program moving." action={<Button onClick={() => notify('Roster import opened')}><Upload data-icon="inline-start" />Import roster</Button>} /><div className="mt-8 grid gap-4 sm:grid-cols-3"><Stat label="Assessments completed" value="248" trend="+12.4%" /><Stat label="Average score" value="76.8%" trend="+3.2%" /><Stat label="Pass rate" value="84.2%" trend="+5.8%" /></div><div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_.6fr]"><section className="glass-card rounded-3xl border border-white/70 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">Candidate roster</h2><p className="mt-1 text-sm text-muted-foreground">Spring Assessment 2026 · 312 candidates</p></div><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><input aria-label="Search roster" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search roster" className="h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm" /></div></div><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="pb-3 font-medium">Candidate</th><th className="pb-3 font-medium">Station</th><th className="pb-3 font-medium">Score</th><th className="pb-3 font-medium">Status</th></tr></thead><tbody>{candidateSeed.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => <tr key={c.id} className="border-b border-border last:border-0"><td className="py-4"><div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{c.initials}</span><span><span className="block font-medium">{c.name}</span><span className="text-xs text-muted-foreground">{c.id}</span></span></div></td><td className="py-4 text-muted-foreground">{c.station}</td><td className="py-4 font-semibold">{c.score}</td><td className="py-4"><span className="rounded-full bg-muted px-2 py-1 text-xs">{c.status}</span></td></tr>)}</tbody></table></div></section><section className="glass-card rounded-3xl border border-white/70 p-5"><h2 className="font-semibold">Station weighting</h2><p className="mt-1 text-sm text-muted-foreground">Adjust the contribution of each domain.</p><div className="mt-6 flex flex-col gap-4">{['Communication','Examination','Reasoning','Professionalism'].map((name, i) => <label key={name} className="text-sm"><span className="flex justify-between"><span>{name}</span><span className="font-semibold">{weights[i]}%</span></span><input type="range" min="0" max="100" value={weights[i]} onChange={(e) => setWeights((prev: number[]) => prev.map((x, index) => index === i ? Number(e.target.value) : x))} className="mt-2 w-full accent-primary" /></label>)}</div><div className={`mt-6 flex items-center justify-between rounded-lg p-3 text-sm ${sum === 100 ? 'bg-accent text-accent-foreground' : 'bg-destructive/10 text-destructive'}`}><span>Total weighting</span><strong>{sum}%</strong></div><Button className="mt-5 w-full" disabled={sum !== 100} onClick={() => notify('Station configuration saved')}>Save configuration</Button></section></div></main> }
function Footer({ navigate }: { navigate: (v: View) => void }) { return <SiteFooter /> }

function Stat({ label, value, trend }: any) { return <div className="glass-card rounded-3xl border border-white/70 p-5"><p className="text-sm text-muted-foreground">{label}</p><div className="mt-2 flex items-end justify-between"><p className="text-3xl font-semibold tracking-tight">{value}</p><span className="text-xs font-semibold text-primary">{trend}</span></div></div> }
function PinModal({ close, submit }: any) { return <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/30 p-5"><div role="dialog" aria-modal="true" aria-labelledby="pin-title" className="w-full max-w-sm glass-card rounded-3xl border border-white/70 p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="pin-title" className="text-lg font-semibold">Confirm submission</h2><p className="mt-1 text-sm text-muted-foreground">Enter your examiner PIN to submit this assessment.</p></div><button aria-label="Close" onClick={close} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="size-5" /></button></div><input aria-label="Examiner PIN" type="password" placeholder="••••" className="mt-6 h-11 w-full rounded-md border border-input bg-background px-3 text-center text-lg tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring" /><div className="mt-5 flex gap-3"><Button variant="outline" className="flex-1" onClick={close}>Cancel</Button><Button className="flex-1" onClick={submit}>Submit</Button></div></div></div> }

