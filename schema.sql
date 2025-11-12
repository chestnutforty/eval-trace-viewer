-- Eval Trace Viewer Database Schema
-- Run this script in your Supabase SQL editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: eval_runs
-- Stores evaluation run metadata
CREATE TABLE IF NOT EXISTS eval_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    model_name TEXT,
    eval_type TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    overall_score FLOAT,
    metrics JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: eval_samples
-- Stores individual evaluation samples with conversation traces
CREATE TABLE IF NOT EXISTS eval_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eval_run_id UUID NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
    sample_index INTEGER NOT NULL,
    question TEXT NOT NULL,
    score FLOAT,
    metrics JSONB DEFAULT '{}',
    conversation JSONB DEFAULT '[]',
    html_report TEXT,
    example_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(eval_run_id, sample_index)
);

-- Table: feedback
-- Stores user feedback on evaluation samples
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES eval_samples(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_eval_runs_timestamp ON eval_runs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_eval_runs_model_name ON eval_runs(model_name);
CREATE INDEX IF NOT EXISTS idx_eval_runs_eval_type ON eval_runs(eval_type);
CREATE INDEX IF NOT EXISTS idx_eval_runs_file_path ON eval_runs(file_path);

CREATE INDEX IF NOT EXISTS idx_eval_samples_eval_run_id ON eval_samples(eval_run_id);
CREATE INDEX IF NOT EXISTS idx_eval_samples_sample_index ON eval_samples(sample_index);
CREATE INDEX IF NOT EXISTS idx_eval_samples_question ON eval_samples USING GIN(to_tsvector('english', question));

CREATE INDEX IF NOT EXISTS idx_feedback_sample_id ON feedback(sample_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Enable Row Level Security (RLS) - Optional, remove if not needed
-- ALTER TABLE eval_runs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE eval_samples ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed)
-- CREATE POLICY "Allow public read access on eval_runs" ON eval_runs FOR SELECT USING (true);
-- CREATE POLICY "Allow public read access on eval_samples" ON eval_samples FOR SELECT USING (true);
-- CREATE POLICY "Allow public all access on feedback" ON feedback FOR ALL USING (true);

-- Grant permissions (if needed)
-- GRANT ALL ON eval_runs TO anon, authenticated;
-- GRANT ALL ON eval_samples TO anon, authenticated;
-- GRANT ALL ON feedback TO anon, authenticated;
