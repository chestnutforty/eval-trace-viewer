from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from uuid import UUID


class EvalRunBase(BaseModel):
    """Base model for evaluation run."""

    name: str
    model_name: Optional[str] = None
    eval_type: Optional[str] = None
    timestamp: datetime
    overall_score: Optional[float] = None
    metrics: Dict[str, float] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    file_path: Optional[str] = None


class EvalRunCreate(EvalRunBase):
    """Model for creating evaluation run."""

    pass


class EvalRun(EvalRunBase):
    """Model for evaluation run with ID."""

    id: UUID
    created_at: datetime
    sample_count: Optional[int] = 0

    class Config:
        from_attributes = True


class EvalSampleBase(BaseModel):
    """Base model for evaluation sample."""

    eval_run_id: UUID
    sample_index: int
    question: str
    score: Optional[float] = None
    metrics: Dict[str, float] = Field(default_factory=dict)
    conversation: List[Dict[str, Any]] = Field(default_factory=list)
    html_report: Optional[str] = None
    example_metadata: Dict[str, Any] = Field(default_factory=dict)


class EvalSampleCreate(EvalSampleBase):
    """Model for creating evaluation sample."""

    pass


class EvalSample(EvalSampleBase):
    """Model for evaluation sample with ID."""

    id: UUID
    created_at: datetime
    feedback_count: Optional[int] = 0

    class Config:
        from_attributes = True


class FeedbackBase(BaseModel):
    """Base model for feedback."""

    sample_id: UUID
    feedback_type: str
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class FeedbackCreate(FeedbackBase):
    """Model for creating feedback."""

    pass


class FeedbackUpdate(BaseModel):
    """Model for updating feedback."""

    feedback_type: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class Feedback(FeedbackBase):
    """Model for feedback with ID."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginationParams(BaseModel):
    """Model for pagination parameters."""

    offset: int = Field(0, ge=0)
    limit: int = Field(50, ge=1, le=100)


class EvalRunFilters(BaseModel):
    """Model for eval run filters."""

    model_name: Optional[str] = None
    eval_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_score: Optional[float] = None
    max_score: Optional[float] = None


class SampleFilters(BaseModel):
    """Model for sample filters."""

    search_query: Optional[str] = None
    min_score: Optional[float] = None
    max_score: Optional[float] = None
    metric_filters: Dict[str, Dict[str, float]] = Field(default_factory=dict)


class IngestRequest(BaseModel):
    """Model for ingestion request."""

    file_paths: Optional[List[str]] = None
    scan_directory: bool = False


class IngestResponse(BaseModel):
    """Model for ingestion response."""

    ingested: int
    skipped: int
    errors: List[str] = Field(default_factory=list)


class PaginatedResponse(BaseModel):
    """Generic paginated response."""

    items: List[Any]
    total: int
    offset: int
    limit: int
