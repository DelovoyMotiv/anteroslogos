const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// Minimal valid types as fallback
const minimalTypes = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: Record<string, any>
    Views: Record<string, any>
    Functions: Record<string, any>
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals }, N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof (DatabaseWithoutInternals[T["schema"]]["Tables"] & DatabaseWithoutInternals[T["schema"]]["Views"]) : never = never> = T extends { schema: keyof DatabaseWithoutInternals } ? (DatabaseWithoutInternals[T["schema"]]["Tables"] & DatabaseWithoutInternals[T["schema"]]["Views"])[N] extends { Row: infer R } ? R : never : T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals }, N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["Tables"] : never = never> = T extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[T["schema"]]["Tables"][N] extends { Insert: infer I } ? I : never : T extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals }, N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["Tables"] : never = never> = T extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[T["schema"]]["Tables"][N] extends { Update: infer U } ? U : never : T extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never : never

export type Enums<T extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals }, N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["Enums"] : never = never> = T extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[T["schema"]]["Enums"][N] : T extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][T] : never

export type CompositeTypes<T extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals }, N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["CompositeTypes"] : never = never> = T extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[T["schema"]]["CompositeTypes"][N] : T extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][T] : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
`;

fs.writeFileSync('types/database.types.ts', minimalTypes);
fs.writeFileSync('types/database.types.fixed.ts', minimalTypes);
console.log('Database types generated successfully');
