export interface ExploreCampaign {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  requirements: string[] | null;
  deliverable_requirements?: any; // JSONB field containing expected deliverables
  budget_cents: number;
  start_date: string | null;
  end_date: string;
  status: string;
  max_creators: number;
  selected_creators_count: number;
  campaign_type: string;
  created_at?: string;
  restaurant?: {
    id: string;
    name: string;
    cuisine_types: string[];
    address: string;
    city: string;
    state: string;
    cover_photo_url?: string;
  };
  applications?: {
    id: string;
    status: string;
    creator_id?: string;
  }[];
}
