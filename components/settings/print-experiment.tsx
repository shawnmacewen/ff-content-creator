'use client';

import { CreditCard, LogIn, PackageCheck, Printer, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const printModules = [
  {
    title: 'Landing Page / SSO',
    eyebrow: 'Entry',
    description: 'A simple branded entry point that explains the print workspace and routes users through SSO.',
    icon: LogIn,
    items: ['Welcome panel', 'SSO handoff', 'Role-aware redirect'],
  },
  {
    title: 'Storefront',
    eyebrow: 'Browse',
    description: 'A light product shelf for print-ready campaign materials, stationery, and approved templates.',
    icon: ShoppingBag,
    items: ['Product cards', 'Template preview', 'Add to order'],
  },
  {
    title: 'My Orders',
    eyebrow: 'Track',
    description: 'A mock order view for status, proofing, shipping notes, and order history.',
    icon: PackageCheck,
    items: ['Order timeline', 'Proof status', 'Reorder action'],
  },
  {
    title: 'Basic Billing',
    eyebrow: 'Pay',
    description: 'The smallest useful billing surface: order totals, invoice state, and payment method placeholder.',
    icon: CreditCard,
    items: ['Cost summary', 'Invoice status', 'Payment method'],
  },
];

export default function PrintExperiment() {
  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="outline">Product Lab</Badge>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Printer className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold leading-tight">Print</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Experimental mock of the core print workflow before this becomes real product scope.
                </p>
              </div>
            </div>
          </div>
          <Button type="button" variant="outline">
            Mock only
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {printModules.map((module) => {
          const Icon = module.icon;

          return (
            <article key={module.title} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-primary">{module.eyebrow}</p>
                  <h3 className="mt-1 text-lg font-semibold leading-tight">{module.title}</h3>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{module.description}</p>
              <div className="mt-4 grid gap-2">
                {module.items.map((item) => (
                  <div key={item} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                    {item}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-primary">Prototype flow</p>
          <h3 className="mt-1 text-xl font-semibold">First happy path</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {['Sign in', 'Pick item', 'Place order', 'Pay later'].map((step, index) => (
              <div key={step} className="rounded-md border border-border bg-background p-3">
                <div className="text-xs font-semibold text-muted-foreground">0{index + 1}</div>
                <div className="mt-2 text-sm font-semibold">{step}</div>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-primary">Reality check</p>
          <h3 className="mt-1 text-xl font-semibold">The print button nobody asked for</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            A deliberately lightweight mock so the team can poke at the shape of print without pretending we already solved
            fulfillment, taxes, shipping, proofs, billing, support, and the 900 emails that arrive five minutes later.
          </p>
        </aside>
      </div>
    </section>
  );
}
