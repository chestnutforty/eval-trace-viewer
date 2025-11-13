from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from uuid import UUID

from ..database import get_db
from ..models import EvalSample, PaginatedResponse, QuestionSummary, SampleWithEvalRun

router = APIRouter()


@router.get("/eval/{eval_id}/samples", response_model=PaginatedResponse)
async def list_samples_for_eval(
    eval_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search_query: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
):
    """List samples for a specific evaluation run with optional filters."""
    db = get_db()

    query = db.table("eval_samples").select(
        "*, feedback(count)", count="exact"
    ).eq("eval_run_id", str(eval_id))

    if search_query:
        query = query.ilike("question", f"%{search_query}%")

    if min_score is not None:
        query = query.gte("score", min_score)
    if max_score is not None:
        query = query.lte("score", max_score)

    response = query.order("sample_index").range(offset, offset + limit - 1).execute()

    count_query = db.table("eval_samples").select("*", count="exact", head=True).eq(
        "eval_run_id", str(eval_id)
    )
    if search_query:
        count_query = count_query.ilike("question", f"%{search_query}%")
    total_response = count_query.execute()
    total = total_response.count if total_response.count else 0

    items = []
    for row in response.data:
        feedback_count = row.get("feedback", [{}])[0].get("count", 0) if row.get("feedback") else 0
        items.append(
            EvalSample(
                id=row["id"],
                eval_run_id=row["eval_run_id"],
                sample_index=row["sample_index"],
                question=row["question"],
                score=row.get("score"),
                metrics=row.get("metrics", {}),
                conversation=row.get("conversation", []),
                html_report=row.get("html_report"),
                example_metadata=row.get("example_metadata", {}),
                created_at=row["created_at"],
                feedback_count=feedback_count,
            )
        )

    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/compare")
async def compare_samples(ids: List[str] = Query(..., description="List of sample IDs to compare")):
    """Compare multiple samples side-by-side."""
    db = get_db()

    sample_ids = [id.strip() for id in ids if id.strip()]

    if len(sample_ids) < 2:
        raise HTTPException(
            status_code=400, detail="At least 2 sample IDs required for comparison"
        )
    if len(sample_ids) > 4:
        raise HTTPException(
            status_code=400, detail="Maximum 4 samples can be compared at once"
        )

    # Validate UUIDs
    try:
        for sample_id in sample_ids:
            UUID(sample_id)
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid UUID format: {str(e)}"
        )

    response = db.table("eval_samples").select("*").in_("id", sample_ids).execute()

    if len(response.data) != len(sample_ids):
        raise HTTPException(
            status_code=404, detail="One or more samples not found"
        )

    samples = []
    for row in response.data:
        samples.append(
            EvalSample(
                id=row["id"],
                eval_run_id=row["eval_run_id"],
                sample_index=row["sample_index"],
                question=row["question"],
                score=row.get("score"),
                metrics=row.get("metrics", {}),
                conversation=row.get("conversation", []),
                html_report=row.get("html_report"),
                example_metadata=row.get("example_metadata", {}),
                created_at=row["created_at"],
                feedback_count=0,
            )
        )

    samples.sort(key=lambda s: sample_ids.index(str(s.id)))
    return {"samples": samples}


@router.get("/questions")
async def list_questions(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search_query: Optional[str] = None,
):
    """List all unique questions with aggregated stats."""
    db = get_db()

    # Fetch samples with pagination applied to the raw data
    # We'll aggregate in Python since Supabase doesn't have great GROUP BY support
    query = db.table("eval_samples").select("question, eval_run_id, created_at")

    if search_query:
        query = query.ilike("question", f"%{search_query}%")

    # Fetch more than we need to ensure we have enough unique questions after aggregation
    # This is a compromise - we fetch a larger batch and aggregate in Python
    fetch_limit = min(1000, (offset + limit) * 10)  # Fetch 10x more to ensure coverage
    response = query.order("created_at", desc=True).range(0, fetch_limit - 1).execute()

    # Aggregate the results in Python
    question_stats = {}
    for row in response.data:
        q = row["question"]
        if q not in question_stats:
            question_stats[q] = {
                "question": q,
                "sample_count": 0,
                "eval_runs": set(),
                "latest_timestamp": row["created_at"],
            }
        question_stats[q]["sample_count"] += 1
        question_stats[q]["eval_runs"].add(row["eval_run_id"])
        # Keep the latest timestamp
        if row["created_at"] > question_stats[q]["latest_timestamp"]:
            question_stats[q]["latest_timestamp"] = row["created_at"]

    # Convert to list and sort by latest timestamp
    questions_list = [
        QuestionSummary(
            question=stats["question"],
            sample_count=stats["sample_count"],
            eval_run_count=len(stats["eval_runs"]),
            latest_timestamp=stats["latest_timestamp"],
        )
        for stats in question_stats.values()
    ]
    questions_list.sort(key=lambda x: x.latest_timestamp, reverse=True)

    # Calculate total unique questions
    total = len(questions_list)

    # Apply pagination to the aggregated results
    paginated_items = questions_list[offset : offset + limit]

    return {
        "items": [item.model_dump() for item in paginated_items],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/by-question")
async def get_samples_by_question(
    question: str = Query(..., description="Exact question text to search for"),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    """Get all samples for a specific question across all eval runs."""
    db = get_db()

    # Query samples with eval_run join to get run metadata
    query = (
        db.table("eval_samples")
        .select("*, eval_runs!inner(name, model_name, timestamp)")
        .ilike("question", question)
    )

    # Get total count
    count_query = (
        db.table("eval_samples")
        .select("*", count="exact", head=True)
        .ilike("question", question)
    )
    total_response = count_query.execute()
    total = total_response.count if total_response.count else 0

    # Get paginated results ordered by eval_run timestamp descending
    response = query.order("eval_runs(timestamp)", desc=True).range(offset, offset + limit - 1).execute()

    items = []
    for row in response.data:
        eval_run_data = row.get("eval_runs")
        if not eval_run_data:
            continue

        items.append(
            SampleWithEvalRun(
                id=row["id"],
                eval_run_id=row["eval_run_id"],
                sample_index=row["sample_index"],
                question=row["question"],
                score=row.get("score"),
                metrics=row.get("metrics", {}),
                conversation=row.get("conversation", []),
                html_report=row.get("html_report"),
                example_metadata=row.get("example_metadata", {}),
                created_at=row["created_at"],
                feedback_count=0,
                eval_run_name=eval_run_data["name"],
                model_name=eval_run_data.get("model_name"),
                eval_run_timestamp=eval_run_data["timestamp"],
            )
        )

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/{sample_id}", response_model=EvalSample)
async def get_sample(sample_id: UUID):
    """Get a single sample with full conversation trace."""
    db = get_db()

    response = (
        db.table("eval_samples")
        .select("*, feedback(count)")
        .eq("id", str(sample_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Sample not found")

    row = response.data[0]
    feedback_count = row.get("feedback", [{}])[0].get("count", 0) if row.get("feedback") else 0

    return EvalSample(
        id=row["id"],
        eval_run_id=row["eval_run_id"],
        sample_index=row["sample_index"],
        question=row["question"],
        score=row.get("score"),
        metrics=row.get("metrics", {}),
        conversation=row.get("conversation", []),
        html_report=row.get("html_report"),
        example_metadata=row.get("example_metadata", {}),
        created_at=row["created_at"],
        feedback_count=feedback_count,
    )
