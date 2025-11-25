/**
 * Programmatic Tool Calling - Anthropic Advanced Tool Use 2025-11-20
 * Executes code in sandbox with pre-bound tool functions
 */

import ivm from 'isolated-vm';
import { SupabaseClient } from '@supabase/supabase-js';

interface ProgrammaticRequest {
  code: string;
  language: 'javascript' | 'python';
  timeout?: number;
}

interface SandboxBindings {
  call_tool: (name: string, params: unknown) => Promise<unknown>;
  get_causal_path: (query: string) => Promise<unknown>;
  get_ucpt_proof: () => Promise<unknown>;
}

export async function executeProgrammatic(
  req: ProgrammaticRequest,
  supabase: SupabaseClient,
  tenantId: string
): Promise<{ result: unknown; ucpt: unknown; executionTime: number }> {
  const startTime = Date.now();
  const timeout = Math.min(req.timeout || 30000, 60000); // max 60s

  if (req.language !== 'javascript') {
    throw new Error('Only JavaScript supported in sandbox');
  }

  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();
  const jail = context.global;

  // Set global object
  await jail.set('global', jail.derefInto());

  // Bind tool functions
  const bindings: SandboxBindings = {
    call_tool: async (name: string, params: unknown) => {
      // Stub: delegate to actual MCP tool executor
      return { tool: name, params, executed: true };
    },
    get_causal_path: async (query: string) => {
      const { data } = await supabase.rpc('get_causal_path', { query_text: query, tenant_id: tenantId });
      return data;
    },
    get_ucpt_proof: async () => {
      const { data } = await supabase.rpc('get_ucpt_proof', { tenant_id: tenantId });
      return data;
    }
  };

  await jail.set('call_tool', new ivm.Reference(bindings.call_tool));
  await jail.set('get_causal_path', new ivm.Reference(bindings.get_causal_path));
  await jail.set('get_ucpt_proof', new ivm.Reference(bindings.get_ucpt_proof));

  // Execute code
  const script = await isolate.compileScript(`(async () => { ${req.code} })()`);
  const result = await script.run(context, { timeout, promise: true });

  const executionTime = Date.now() - startTime;
  const ucpt = await bindings.get_ucpt_proof();

  return { result, ucpt, executionTime };
}
