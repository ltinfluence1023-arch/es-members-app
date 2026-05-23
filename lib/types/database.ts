export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ChipTransactionType = "checkin" | "transfer" | "admin" | "event" | "fee" | "purchase" | "coupon" | "seat_out" | "withdraw" | "quiz" | "achievement" | "blackjack";
export type FeeSource = "transfer_fee" | "rake" | "manual_add" | "manual_subtract";
export type PointTransactionType =
  | "accounting_reward"
  | "accounting_payment"
  | "ranking_reward"
  | "coupon_exchange"
  | "coupon_refund"
  | "admin"
  | "checkin";
export type CouponSource = "admin_grant" | "point_exchange" | "ranking_reward";
export type QrTokenPurpose = "user_receive" | "coupon_redeem";
export type AdminRole = "admin" | "staff";

export interface Database {
  public: {
    Tables: {
      ranks: {
        Row: {
          id: string;
          name: string;
          required_visit_count: number;
          checkin_bonus: number;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          required_visit_count?: number;
          checkin_bonus?: number;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          required_visit_count?: number;
          checkin_bonus?: number;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          nickname: string;
          email_or_phone: string;
          chip_balance: number;
          point_balance: number;
          total_visit_count: number;
          rank_id: string | null;
          created_at: string;
          last_visit_at: string | null;
          birthday: string | null;
          gender: "male" | "female" | "other" | null;
          avatar_url: string | null;
          line_user_id: string | null;
        };
        Insert: {
          id: string;
          nickname: string;
          email_or_phone: string;
          chip_balance?: number;
          point_balance?: number;
          total_visit_count?: number;
          rank_id?: string | null;
          created_at?: string;
          last_visit_at?: string | null;
          birthday?: string | null;
          gender?: "male" | "female" | "other" | null;
          avatar_url?: string | null;
          line_user_id?: string | null;
        };
        Update: {
          id?: string;
          nickname?: string;
          email_or_phone?: string;
          chip_balance?: number;
          point_balance?: number;
          total_visit_count?: number;
          rank_id?: string | null;
          created_at?: string;
          last_visit_at?: string | null;
          birthday?: string | null;
          gender?: "male" | "female" | "other" | null;
          avatar_url?: string | null;
          line_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_rank_id_fkey";
            columns: ["rank_id"];
            isOneToOne: false;
            referencedRelation: "ranks";
            referencedColumns: ["id"];
          }
        ];
      };
      admin_users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: AdminRole;
          password_plain: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role: AdminRole;
          password_plain?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: AdminRole;
          password_plain?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chip_transactions: {
        Row: {
          id: string;
          from_user_id: string | null;
          to_user_id: string | null;
          amount: number;
          type: ChipTransactionType;
          memo: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id?: string | null;
          to_user_id?: string | null;
          amount: number;
          type: ChipTransactionType;
          memo?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_user_id?: string | null;
          to_user_id?: string | null;
          amount?: number;
          type?: ChipTransactionType;
          memo?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      point_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: PointTransactionType;
          memo: string | null;
          related_coupon_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: PointTransactionType;
          memo?: string | null;
          related_coupon_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: PointTransactionType;
          memo?: string | null;
          related_coupon_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      visits: {
        Row: {
          id: string;
          user_id: string;
          checked_in_at: string;
          bonus_chip: number;
          store_id: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          checked_in_at?: string;
          bonus_chip?: number;
          store_id?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          checked_in_at?: string;
          bonus_chip?: number;
          store_id?: string;
        };
        Relationships: [];
      };
      notices: {
        Row: {
          id: string;
          title: string;
          body: string;
          image_url: string | null;
          is_published: boolean;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          image_url?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string;
          image_url?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      coupon_templates: {
        Row: {
          id: string;
          name: string;
          subtitle: string | null;
          description: string | null;
          notice: string | null;
          image_url: string | null;
          point_cost: number | null;
          valid_days: number;
          max_issuance: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subtitle?: string | null;
          description?: string | null;
          notice?: string | null;
          image_url?: string | null;
          point_cost?: number | null;
          valid_days?: number;
          max_issuance?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subtitle?: string | null;
          description?: string | null;
          notice?: string | null;
          image_url?: string | null;
          point_cost?: number | null;
          valid_days?: number;
          max_issuance?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          id: string;
          template_id: string;
          user_id: string;
          source: CouponSource;
          issued_at: string;
          expires_at: string;
          reserved_at: string | null;
          reserved_code: string | null;
          used_at: string | null;
          used_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          user_id: string;
          source: CouponSource;
          issued_at?: string;
          expires_at: string;
          reserved_at?: string | null;
          reserved_code?: string | null;
          used_at?: string | null;
          used_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          user_id?: string;
          source?: CouponSource;
          issued_at?: string;
          expires_at?: string;
          reserved_at?: string | null;
          reserved_code?: string | null;
          used_at?: string | null;
          used_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      qr_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          purpose: QrTokenPurpose;
          related_id: string | null;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          purpose: QrTokenPurpose;
          related_id?: string | null;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          purpose?: QrTokenPurpose;
          related_id?: string | null;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          action: string;
          category: string;
          summary: string | null;
          target_type: string | null;
          target_id: string | null;
          target_label: string | null;
          details: Json | null;
          actor_id: string | null;
          actor_name: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: string;
          category: string;
          summary?: string | null;
          target_type?: string | null;
          target_id?: string | null;
          target_label?: string | null;
          details?: Json | null;
          actor_id?: string | null;
          actor_name?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          action?: string;
          category?: string;
          summary?: string | null;
          target_type?: string | null;
          target_id?: string | null;
          target_label?: string | null;
          details?: Json | null;
          actor_id?: string | null;
          actor_name?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          id: string;
          question: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_option: "a" | "b" | "c" | "d";
          is_active: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          question: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_option: "a" | "b" | "c" | "d";
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          question?: string;
          option_a?: string;
          option_b?: string;
          option_c?: string;
          option_d?: string;
          correct_option?: "a" | "b" | "c" | "d";
          is_active?: boolean;
        };
        Relationships: [];
      };
      daily_quiz_schedule: {
        Row: { business_day_ts: number; question_id: string };
        Insert: { business_day_ts: number; question_id: string };
        Update: { question_id?: string };
        Relationships: [];
      };
      quiz_answers: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          business_day_ts: number;
          selected_option: "a" | "b" | "c" | "d";
          is_correct: boolean;
          chip_awarded: boolean;
          answered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          business_day_ts: number;
          selected_option: string;
          is_correct: boolean;
          chip_awarded?: boolean;
          answered_at?: string;
        };
        Update: { chip_awarded?: boolean };
        Relationships: [];
      };
      blackjack_sessions: {
        Row: {
          id: string; user_id: string; bet: number;
          deck: unknown; player_hand: unknown; dealer_hand: unknown;
          status: string; net_chips: number; settled: boolean; created_at: string;
        };
        Insert: {
          id?: string; user_id: string; bet: number;
          deck: unknown; player_hand: unknown; dealer_hand: unknown;
          status?: string; net_chips?: number; settled?: boolean; created_at?: string;
        };
        Update: { player_hand?: unknown; dealer_hand?: unknown; deck?: unknown; status?: string; net_chips?: number; settled?: boolean; };
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string; code: string; name: string; description: string;
          category: string; difficulty: number; points: number;
          chip_reward: number; track_type: string; is_active: boolean;
          sort_order: number; created_at: string;
        };
        Insert: {
          id?: string; code: string; name: string; description: string;
          category: string; difficulty: number; points?: number;
          chip_reward?: number; track_type: string; is_active?: boolean;
          sort_order?: number; created_at?: string;
        };
        Update: { points?: number; chip_reward?: number; is_active?: boolean; sort_order?: number; };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string; user_id: string; achievement_id: string;
          granted_by: string | null; note: string | null; achieved_at: string;
        };
        Insert: {
          id?: string; user_id: string; achievement_id: string;
          granted_by?: string | null; note?: string | null; achieved_at?: string;
        };
        Update: { note?: string | null };
        Relationships: [];
      };
      achievement_claims: {
        Row: {
          id: string; user_id: string; achievement_id: string;
          proof_url: string | null; message: string | null;
          status: string; reviewed_by: string | null;
          review_note: string | null; claimed_at: string; reviewed_at: string | null;
        };
        Insert: {
          id?: string; user_id: string; achievement_id: string;
          proof_url?: string | null; message?: string | null;
          status?: string; reviewed_by?: string | null;
          review_note?: string | null; claimed_at?: string; reviewed_at?: string | null;
        };
        Update: { status?: string; reviewed_by?: string | null; review_note?: string | null; reviewed_at?: string | null; };
        Relationships: [];
      };
      fee_transactions: {
        Row: {
          id: string;
          amount: number;
          source: FeeSource;
          memo: string | null;
          related_user_id: string | null;
          related_chip_tx_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          amount: number;
          source: FeeSource;
          memo?: string | null;
          related_user_id?: string | null;
          related_chip_tx_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          amount?: number;
          source?: FeeSource;
          memo?: string | null;
          related_user_id?: string | null;
          related_chip_tx_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      exchange_point_for_coupon: {
        Args: { p_user_id: string; p_template_id: string };
        Returns: string;
      };
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// 便利な型エイリアス
export type User = Database["public"]["Tables"]["users"]["Row"];
export type AdminUser = Database["public"]["Tables"]["admin_users"]["Row"];
export type Rank = Database["public"]["Tables"]["ranks"]["Row"];
export type ChipTransaction =
  Database["public"]["Tables"]["chip_transactions"]["Row"];
export type PointTransaction =
  Database["public"]["Tables"]["point_transactions"]["Row"];
export type Visit = Database["public"]["Tables"]["visits"]["Row"];
export type Notice = Database["public"]["Tables"]["notices"]["Row"];
export type CouponTemplate =
  Database["public"]["Tables"]["coupon_templates"]["Row"];
export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type QrToken = Database["public"]["Tables"]["qr_tokens"]["Row"];
