export type PersonaType = 
  | 'trendsetter'
  | 'culinary_adventurer'
  | 'luxe_planner'
  | 'hidden_gem_hunter'
  | 'comfort_seeker'
  | 'budget_foodie'
  | 'social_explorer'
  | 'local_expert';

export interface PersonaScores {
  trendsetter: number;
  culinary_adventurer: number;
  luxe_planner: number;
  hidden_gem_hunter: number;
  comfort_seeker: number;
  budget_foodie: number;
  social_explorer: number;
  local_expert: number;
}

export interface Persona {
  id: PersonaType;
  name: string;
  emoji: string;
  color: string;
  description: string;
  traits: string[];
}

export interface QuizAnswer {
  questionId: number;
  answerId: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
}

export interface QuizOption {
  id: string;
  text: string;
  weights: Partial<PersonaScores>;
}

export type FavoriteSpotCategory = 
  | 'brunch'
  | 'dinner'
  | 'date'
  | 'recommend'
  | 'comfort'
  | 'special';

export interface FavoriteSpot {
  id?: string;
  user_id?: string;
  restaurant_name: string;
  category: FavoriteSpotCategory;
  location?: string;
  address?: string;
  price_range?: 1 | 2 | 3 | 4;
  cuisine_type?: string;
  notes?: string;
  created_at?: Date;
  last_visited?: Date;
  visit_frequency?: 'weekly' | 'monthly' | 'occasionally' | 'rarely';
}

export interface FavoriteSpotCategoryInfo {
  id: FavoriteSpotCategory;
  name: string;
  emoji: string;
  description: string;
  examples: string;
}

export interface OnboardingState {
  currentStep: 'welcome' | 'signup' | 'verify' | 'quiz-intro' | 'quiz' | 'profile' | 'favorites' | 'complete';
  phoneNumber?: string;
  quizAnswers: QuizAnswer[];
  persona?: PersonaType;
  personaScores?: PersonaScores;
  favoriteSpots: FavoriteSpot[];
  profileImageUrl?: string;
  username?: string;
  bio?: string;
  hasSeenQuizIntro?: boolean;
}