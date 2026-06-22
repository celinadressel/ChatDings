export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      chats: {
        Row: {
          id: string;
          name: string | null;
          avatar_url: string | null;
          is_group: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          avatar_url?: string | null;
          is_group?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          name?: string | null;
          avatar_url?: string | null;
          is_group?: boolean;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chats_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_members: {
        Row: {
          chat_id: string;
          user_id: string;
          joined_at: string;
          role: "admin" | "member";
        };
        Insert: {
          chat_id: string;
          user_id: string;
          joined_at?: string;
          role?: "admin" | "member";
        };
        Update: {
          role?: "admin" | "member";
        };
        Relationships: [
          {
            foreignKeyName: "chat_members_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
          is_deleted: boolean;
          file_url: string | null;
          file_name: string | null;
          file_type: string | null;
          file_size: number | null;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
          is_deleted?: boolean;
          file_url?: string | null;
          file_name?: string | null;
          file_type?: string | null;
          file_size?: number | null;
        };
        Update: {
          content?: string;
          updated_at?: string;
          is_deleted?: boolean;
          file_url?: string | null;
          file_name?: string | null;
          file_type?: string | null;
          file_size?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      locations: {
        Row: {
          id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          accuracy: number | null;
          is_sharing: boolean;
          expires_at: string | null;
          chat_id: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          latitude: number;
          longitude: number;
          accuracy?: number | null;
          is_sharing?: boolean;
          expires_at?: string | null;
          chat_id?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          latitude?: number;
          longitude?: number;
          accuracy?: number | null;
          is_sharing?: boolean;
          expires_at?: string | null;
          chat_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "locations_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}