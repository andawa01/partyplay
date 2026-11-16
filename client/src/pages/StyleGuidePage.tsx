import { useState, type ReactNode } from "react";

import { ApiError } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ErrorState } from "../components/ui/error-state";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";

const brandSteps = [
  { step: "50", hex: "#f0f9ff", className: "bg-brand-50" },
  { step: "100", hex: "#e0f2fe", className: "bg-brand-100" },
  { step: "200", hex: "#bae6fd", className: "bg-brand-200" },
  { step: "300", hex: "#7dd3fc", className: "bg-brand-300" },
  { step: "400", hex: "#38bdf8", className: "bg-brand-400" },
  { step: "500", hex: "#0ea5e9", className: "bg-brand-500" },
  { step: "600", hex: "#0284c7", className: "bg-brand-600" },
  { step: "700", hex: "#0369a1", className: "bg-brand-700" },
  { step: "800", hex: "#075985", className: "bg-brand-800" },
  { step: "900", hex: "#0c4a6e", className: "bg-brand-900" },
];

const blushSteps = [
  { step: "50", hex: "#fdf2f7", className: "bg-blush-50" },
  { step: "100", hex: "#fbe4ee", className: "bg-blush-100" },
  { step: "200", hex: "#f7c9db", className: "bg-blush-200" },
  { step: "300", hex: "#f1a3c1", className: "bg-blush-300" },
  { step: "400", hex: "#e97aa5", className: "bg-blush-400" },
  { step: "500", hex: "#de5588", className: "bg-blush-500" },
  { step: "600", hex: "#c73e70", className: "bg-blush-600" },
  { step: "700", hex: "#a52f5c", className: "bg-blush-700" },
  { step: "800", hex: "#86274c", className: "bg-blush-800" },
  { step: "900", hex: "#6e2240", className: "bg-blush-900" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-blush-100 py-10">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Scale({
  name,
  steps,
}: {
  name: string;
  steps: Array<{ step: string; hex: string; className: string }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-900">{name}</h3>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {steps.map((colour) => (
          <li key={colour.step}>
            <div
              className={`h-14 rounded-md border border-slate-200 ${colour.className}`}
            />
            <p className="mt-1 text-xs font-medium text-slate-900">
              {name.toLowerCase()}-{colour.step}
            </p>
            <p className="text-xs text-slate-500">{colour.hex}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StyleGuidePage() {
  // Starts empty on purpose: Radix only knows an item's label once that item has
  // mounted, so a preset value would render a blank trigger until first opened.
  const [packageChoice, setPackageChoice] = useState("");
  const [retrying, setRetrying] = useState(false);

  // Demo only: show the retry's busy state for a moment, then return to the failure.
  const handleDemoRetry = () => {
    setRetrying(true);
    setTimeout(() => setRetrying(false), 1200);
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Style guide</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        The shared palette and primitives every slice reuses. Values live in{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">src/index.css</code>; sky
        blue carries primary actions, links and focus, baby pink is an accent only.
      </p>

      <Section
        title="Palette"
        description="Two token scales on white surfaces. Nothing should use raw hex values."
      >
        <div className="space-y-6">
          <Scale name="Brand" steps={brandSteps} />
          <Scale name="Blush" steps={blushSteps} />
        </div>
      </Section>

      <Section
        title="Buttons"
        description="Primary is sky blue, secondary is baby pink, outline and ghost pick up a blush hover tint."
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Save booking</Button>
            <Button variant="secondary">Add note</Button>
            <Button variant="outline">Cancel</Button>
            <Button variant="ghost">Back</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="link">View details</Button>
            <Button disabled>Disabled</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Close">
              ×
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="Badges"
        description="Default sky blue for neutral labels, blush for promotions, semantic colours only for status."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge>New</Badge>
          <Badge variant="secondary">Offer</Badge>
          <Badge variant="outline">Draft</Badge>
          <Badge variant="success">Confirmed</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="destructive">Cancelled</Badge>
        </div>
      </Section>

      <Section
        title="Form states"
        description="Labels are always tied to their input. Invalid fields use aria-invalid plus a message, never colour alone."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="guide-name">Full name</Label>
            <Input id="guide-name" placeholder="e.g. Wanjiru Kamau" />
            <p className="text-xs text-slate-500">Default and focus state.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guide-phone">Phone number</Label>
            <Input
              id="guide-phone"
              defaultValue="0700"
              aria-invalid="true"
              aria-describedby="guide-phone-error"
            />
            <p id="guide-phone-error" className="text-xs font-medium text-red-700">
              Enter a valid Kenyan phone number.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guide-email">Email (optional)</Label>
            <Input id="guide-email" type="email" placeholder="you@example.com" />
            <p className="text-xs text-slate-500">Helper text sits below the field.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guide-disabled">Booking code</Label>
            <Input id="guide-disabled" defaultValue="PP-000000" disabled />
            <p className="text-xs text-slate-500">Disabled fields stay quiet but readable.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guide-notes">Delivery notes</Label>
            <Textarea id="guide-notes" placeholder="Gate code, floor, landmarks…" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guide-package">Package</Label>
            <Select
              value={packageChoice === "" ? undefined : packageChoice}
              onValueChange={setPackageChoice}
            >
              <SelectTrigger id="guide-package">
                <SelectValue placeholder="Choose a package" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="castle">Bouncy castle party</SelectItem>
                <SelectItem value="sound">Sound and lights</SelectItem>
                <SelectItem value="full">Full party setup</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Selected: {packageChoice === "" ? "nothing yet" : packageChoice}
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Loading"
        description="Skeletons mirror the shape of the content that is arriving, so the page does not jump when data lands."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-2/3" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </div>

          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title="Errors"
        description="One surface for every failed request: server wording, the error code, and a retry only when retrying can help."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">With retry</h3>
            <ErrorState
              error={
                new ApiError(
                  409,
                  "INVALID_TRANSITION",
                  "A completed booking cannot be cancelled.",
                )
              }
              onRetry={handleDemoRetry}
              isRetrying={retrying}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">Retry cannot help</h3>
            <ErrorState
              title="Equipment not found"
              error={new ApiError(404, "NOT_FOUND", "That equipment listing no longer exists.")}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">Unexpected failure</h3>
            <ErrorState error={new Error("We could not reach the server.")} />
          </div>
        </div>
      </Section>
    </section>
  );
}
