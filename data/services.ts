/**
 * Shared discipline data module.
 *
 * Single source of truth for the studio's six disciplines, their lifecycle
 * grouping, and the capabilities marquee keywords. The hero readout, the
 * Services section, and the marquee all consume this module so their copy and
 * ordering stay consistent.
 *
 * House style: no em dash characters, no AI-buzzword vocabulary, active voice,
 * concrete capabilities.
 */

import type { LucideIcon } from 'lucide-react';
import { Server, Search, LineChart, Layers, Activity, BrainCircuit } from 'lucide-react';

/** One of the four ordered delivery stages used to group disciplines. */
export type LifecyclePhase = 'BUILD' | 'RUN' | 'GROW' | 'SHAPE';

/** Canonical order of the delivery lifecycle phases. */
export const LIFECYCLE_ORDER: LifecyclePhase[] = ['BUILD', 'RUN', 'GROW', 'SHAPE'];

/** A single service offering. */
export interface Discipline {
  /** Stable slug, e.g. 'sre-devops'. */
  id: string;
  /** Display title. */
  title: string;
  /** One-line summary. */
  summary: string;
  /** Supporting bullet points. */
  points: string[];
  /** Assigned lifecycle phase. */
  phase: LifecyclePhase;
  /** Icon reference rendered directly by consumers. */
  icon: LucideIcon;
}

/**
 * The complete Discipline_Set: exactly six disciplines, listed in lifecycle
 * order (BUILD, RUN, GROW, SHAPE).
 */
export const DISCIPLINES: Discipline[] = [
  {
    id: 'high-load-engineering',
    title: 'High-load engineering',
    summary: 'Architecture and development of systems that stay fast under real traffic.',
    points: [
      'Distributed systems & APIs',
      'Real-time & event-driven platforms',
      'Cloud infrastructure & observability',
    ],
    phase: 'BUILD',
    icon: Server,
  },
  {
    id: 'ai-ml-data',
    title: 'AI/ML & data',
    summary:
      'We build retrieval-augmented generation, model integration, agents, and the data pipelines behind them.',
    points: [
      'Retrieval-augmented generation',
      'LLM integration',
      'AI agents',
      'Data pipelines',
    ],
    phase: 'BUILD',
    icon: BrainCircuit,
  },
  {
    id: 'sre-devops',
    title: 'SRE & DevOps',
    summary:
      'We keep production running: monitoring, automated delivery, and infrastructure you can trust.',
    points: [
      '24/7 monitoring & incident response',
      'CI/CD & Infrastructure-as-Code',
      'Cloud & server administration',
      'Backups & disaster recovery',
      'Network security & compliance',
      'Migration & cost optimization',
    ],
    phase: 'RUN',
    icon: Activity,
  },
  {
    id: 'seo-geo',
    title: 'SEO / GEO',
    summary: 'Rank where people search, and become the source generative engines quote.',
    points: [
      'Technical & content SEO',
      'Generative engine optimization',
      'Structured data & entity work',
    ],
    phase: 'GROW',
    icon: Search,
  },
  {
    id: 'digital-marketing',
    title: 'Digital marketing',
    summary: 'Performance and brand work tied to revenue, not impressions.',
    points: [
      'Paid acquisition & lifecycle',
      'Content & editorial strategy',
      'Analytics & attribution',
    ],
    phase: 'GROW',
    icon: LineChart,
  },
  {
    id: 'brand-interface',
    title: 'Brand & interface',
    summary: 'Identity and product design that hold up in the room and in the browser.',
    points: [
      'Brand identity & systems',
      'Product & UX design',
      'Design-to-build handoff',
    ],
    phase: 'SHAPE',
    icon: Layers,
  },
];

/**
 * Ordered marquee keywords. Combines the existing capability keywords with the
 * new SRE & DevOps and AI/ML & data entries. Rendered twice by the marquee for
 * the seamless scroll loop.
 */
export const CAPABILITY_KEYWORDS: string[] = [
  'High-load engineering',
  'Distributed systems',
  'Real-time platforms',
  'Cloud infrastructure',
  'SRE & DevOps',
  'CI/CD',
  'Observability',
  'Incident response',
  'AI/ML & data',
  'RAG',
  'LLM integration',
  'Data pipelines',
  'SEO',
  'Generative engine optimization',
  'Performance marketing',
  'Analytics & attribution',
  'Brand & interface',
  'Design systems',
];

/**
 * Returns all disciplines in lifecycle order (BUILD, RUN, GROW, SHAPE), with
 * disciplines grouped by phase and no phase interleaving. Pure function.
 */
export const disciplinesInLifecycleOrder = (): Discipline[] =>
  LIFECYCLE_ORDER.flatMap((phase) => DISCIPLINES.filter((d) => d.phase === phase));

/**
 * Returns every discipline assigned to the given lifecycle phase. Pure function.
 */
export const disciplinesByPhase = (phase: LifecyclePhase): Discipline[] =>
  DISCIPLINES.filter((d) => d.phase === phase);
