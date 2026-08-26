export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      bills: {
        Row: {
          id: string;
          slug: string;
          title: string;
          bill_number: string | null;
          year: string | null;
          house: string | null;
          sponsor: string | null;
          source_url: string | null;
          input_method: string;
          original_filename: string | null;
          raw_text: string;
          explanatory_memorandum: string | null;
          clauses: Json;
          classification: Json;
          summary: Json;
          versions: Json;
          status: string;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          title: string;
          bill_number?: string | null;
          year?: string | null;
          house?: string | null;
          sponsor?: string | null;
          source_url?: string | null;
          input_method: string;
          original_filename?: string | null;
          raw_text: string;
          explanatory_memorandum?: string | null;
          clauses?: Json;
          classification?: Json;
          summary?: Json;
          versions?: Json;
          status?: string;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bills"]["Insert"]>;
        Relationships: [];
      };
      findings: {
        Row: {
          id: string;
          bill_id: string;
          clause_id: string;
          clause_number: string;
          clause_text: string;
          issue_type: string;
          title: string;
          what_it_does: string;
          why_it_matters: string;
          citizen_explanation: string;
          legal_explanation: string;
          counterargument: string;
          what_to_investigate: string;
          severity: string;
          confidence: string;
          confidence_score: number;
          provision_ids: Json;
          citations: Json;
          triggering_language: Json;
          concepts: Json;
          rules_triggered: Json;
          why_flagged: Json;
          human_review_recommended: boolean;
          feedback: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          bill_id: string;
          clause_id: string;
          clause_number: string;
          clause_text: string;
          issue_type: string;
          title: string;
          what_it_does: string;
          why_it_matters: string;
          citizen_explanation: string;
          legal_explanation: string;
          counterargument: string;
          what_to_investigate: string;
          severity: string;
          confidence: string;
          confidence_score?: number;
          provision_ids?: Json;
          citations?: Json;
          triggering_language?: Json;
          concepts?: Json;
          rules_triggered?: Json;
          why_flagged?: Json;
          human_review_recommended?: boolean;
          feedback?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["findings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      katibaism_dashboard_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
