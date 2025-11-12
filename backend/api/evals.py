import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from uuid import UUID
from datetime import datetime

from ..database import get_db
from ..models import (
    EvalRun,
    EvalRunFilters,
    PaginationParams,
    IngestRequest,
    IngestResponse,
    PaginatedResponse,
)
from ..config import settings

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
async def list_eval_runs(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    model_name: Optional[str] = None,
    eval_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
):
    """List all evaluation runs with optional filters."""
    db = get_db()

    query = db.table("eval_runs").select("*, eval_samples(count)", count="exact")

    if model_name:
        query = query.ilike("model_name", f"%{model_name}%")
    if eval_type:
        query = query.eq("eval_type", eval_type)
    if start_date:
        query = query.gte("timestamp", start_date.isoformat())
    if end_date:
        query = query.lte("timestamp", end_date.isoformat())
    if min_score is not None:
        query = query.gte("overall_score", min_score)
    if max_score is not None:
        query = query.lte("overall_score", max_score)

    response = query.order("timestamp", desc=True).range(offset, offset + limit - 1).execute()

    total_response = (
        db.table("eval_runs").select("*", count="exact", head=True).execute()
    )
    total = total_response.count if total_response.count else 0

    items = []
    for row in response.data:
        sample_count = row.get("eval_samples", [{}])[0].get("count", 0) if row.get("eval_samples") else 0
        items.append(
            EvalRun(
                id=row["id"],
                name=row["name"],
                model_name=row.get("model_name"),
                eval_type=row.get("eval_type"),
                timestamp=row["timestamp"],
                overall_score=row.get("overall_score"),
                metrics=row.get("metrics", {}),
                metadata=row.get("metadata", {}),
                file_path=row.get("file_path"),
                created_at=row["created_at"],
                sample_count=sample_count,
            )
        )

    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{eval_id}", response_model=EvalRun)
async def get_eval_run(eval_id: UUID):
    """Get a single evaluation run by ID."""
    db = get_db()

    response = (
        db.table("eval_runs")
        .select("*, eval_samples(count)")
        .eq("id", str(eval_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Evaluation run not found")

    row = response.data[0]
    sample_count = row.get("eval_samples", [{}])[0].get("count", 0) if row.get("eval_samples") else 0

    return EvalRun(
        id=row["id"],
        name=row["name"],
        model_name=row.get("model_name"),
        eval_type=row.get("eval_type"),
        timestamp=row["timestamp"],
        overall_score=row.get("overall_score"),
        metrics=row.get("metrics", {}),
        metadata=row.get("metadata", {}),
        file_path=row.get("file_path"),
        created_at=row["created_at"],
        sample_count=sample_count,
    )


@router.delete("/{eval_id}")
async def delete_eval_run(eval_id: UUID):
    """Delete an evaluation run and all associated samples."""
    db = get_db()

    db.table("eval_samples").delete().eq("eval_run_id", str(eval_id)).execute()
    response = db.table("eval_runs").delete().eq("id", str(eval_id)).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Evaluation run not found")

    return {"message": "Evaluation run deleted successfully"}


@router.get("/files/list")
async def list_available_files():
    """List available JSON files in the results directory."""
    results_dir = settings.results_dir

    if not os.path.exists(results_dir):
        raise HTTPException(status_code=404, detail=f"Results directory not found: {results_dir}")

    files = []
    for filename in os.listdir(results_dir):
        if filename.endswith("_allresults.json"):
            file_path = os.path.join(results_dir, filename)
            stat = os.stat(file_path)
            files.append(
                {
                    "filename": filename,
                    "path": file_path,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                }
            )

    files.sort(key=lambda x: x["modified"], reverse=True)
    return {"files": files}


@router.post("/ingest", response_model=IngestResponse)
async def ingest_results(request: IngestRequest):
    """
    Ingest evaluation results from JSON files.

    This endpoint triggers the ingestion script to load results into the database.
    """
    from ..scripts.ingest_results import ingest_files, scan_and_ingest

    if request.scan_directory:
        result = await scan_and_ingest(settings.results_dir)
    elif request.file_paths:
        result = await ingest_files(request.file_paths)
    else:
        raise HTTPException(
            status_code=400, detail="Must provide either file_paths or scan_directory=true"
        )

    return IngestResponse(
        ingested=result["ingested"], skipped=result["skipped"], errors=result["errors"]
    )
