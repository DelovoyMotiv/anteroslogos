/**
 * Trust-strip configuration module.
 *
 * Supplies the labels and values rendered by the Trust_Strip on the SRE &
 * DevOps page. Numbers live here in config, never in body copy, so they can be
 * corrected before launch without touching the page component.
 *
 * House style: no em dash characters, no AI-buzzword vocabulary. Default values
 * are framed as targets, not measured historical results.
 */

/** A single trust statistic rendered by the Trust_Strip. */
export interface TrustStat {
  /** Display label, e.g. 'Monitoring coverage'. */
  label: string;
  /** Display value as a string so it can carry units and comparators. */
  value: string;
}

/**
 * The Trust_Strip_Config. Default values are framed as targets rather than as
 * measured history. An empty array means the strip renders nothing.
 */
export const TRUST_STRIP_CONFIG: TrustStat[] = [
  { label: 'Monitoring coverage', value: '24/7' },
  { label: 'Incident response target', value: '< 15 min' },
  { label: 'Uptime target', value: '99.9%' },
];
