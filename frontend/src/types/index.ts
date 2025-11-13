export interface ToolsMetadata {
  mcp_servers: string[];
  enable_internal_browser: boolean;
  enable_internal_python: boolean;
}

export interface EvalRunMetadata {
  example_level_metadata?: any[];
  tools?: ToolsMetadata;
  developer_message?: string | null;
  [key: string]: any;
}

export interface EvalRun {
  id: string;
  name: string;
  model_name?: string;
  eval_type?: string;
  timestamp: string;
  overall_score?: number;
  metrics: Record<string, number>;
  metadata: EvalRunMetadata;
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

export interface QuestionSummary {
  question: string;
  sample_count: number;
  eval_run_count: number;
  latest_timestamp: string;
}

export interface SampleWithEvalRun extends EvalSample {
  eval_run_name: string;
  model_name?: string;
  eval_run_timestamp: string;
}
