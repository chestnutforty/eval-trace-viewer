export interface EvalRun {
  id: string;
  name: string;
  model_name?: string;
  eval_type?: string;
  timestamp: string;
  overall_score?: number;
  metrics: Record<string, number>;
  metadata: Record<string, any>;
  file_path?: string;
  created_at: string;
  sample_count?: number;
}

export interface EvalSample {
  id: string;
  eval_run_id: string;
  sample_index: number;
  question: string;
  score?: number;
  metrics: Record<string, number>;
  conversation: Message[];
  html_report?: string;
  example_metadata: Record<string, any>;
  created_at: string;
  feedback_count?: number;
}

export interface Message {
  role?: string;
  content?: string | any;
  id?: string;
  type?: string;
  summary?: any[];
  encrypted_content?: any;
  status?: any;
  code?: string;
  container_id?: string;
  outputs?: any[];
  text?: string;
  [key: string]: any;
}

export interface Feedback {
  id: string;
  sample_id: string;
  feedback_type: string;
  rating?: number;
  notes?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface FeedbackCreate {
  sample_id: string;
  feedback_type: string;
  rating?: number;
  notes?: string;
  tags: string[];
}

export interface FeedbackUpdate {
  feedback_type?: string;
  rating?: number;
  notes?: string;
  tags?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface EvalRunFilters {
  model_name?: string;
  eval_type?: string;
  start_date?: string;
  end_date?: string;
  min_score?: number;
  max_score?: number;
}

export interface SampleFilters {
  search_query?: string;
  min_score?: number;
  max_score?: number;
  metric_filters?: Record<string, Record<string, number>>;
}
