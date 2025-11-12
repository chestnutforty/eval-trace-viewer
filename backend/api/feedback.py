from typing import List
from fastapi import APIRouter, HTTPException
from uuid import UUID
from datetime import datetime

from ..database import get_db
from ..models import Feedback, FeedbackCreate, FeedbackUpdate

router = APIRouter()


@router.get("/sample/{sample_id}/feedback", response_model=List[Feedback])
async def get_sample_feedback(sample_id: UUID):
    """Get all feedback for a specific sample."""
    db = get_db()

    response = (
        db.table("feedback")
        .select("*")
        .eq("sample_id", str(sample_id))
        .order("created_at", desc=True)
        .execute()
    )

    feedbacks = []
    for row in response.data:
        feedbacks.append(
            Feedback(
                id=row["id"],
                sample_id=row["sample_id"],
                feedback_type=row["feedback_type"],
                rating=row.get("rating"),
                notes=row.get("notes"),
                tags=row.get("tags", []),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
        )

    return feedbacks


@router.post("/sample/{sample_id}/feedback", response_model=Feedback)
async def create_feedback(sample_id: UUID, feedback: FeedbackCreate):
    """Create new feedback for a sample."""
    db = get_db()

    response = db.table("eval_samples").select("id").eq("id", str(sample_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Sample not found")

    now = datetime.utcnow().isoformat()
    feedback_data = {
        "sample_id": str(sample_id),
        "feedback_type": feedback.feedback_type,
        "rating": feedback.rating,
        "notes": feedback.notes,
        "tags": feedback.tags,
        "created_at": now,
        "updated_at": now,
    }

    response = db.table("feedback").insert(feedback_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create feedback")

    row = response.data[0]
    return Feedback(
        id=row["id"],
        sample_id=row["sample_id"],
        feedback_type=row["feedback_type"],
        rating=row.get("rating"),
        notes=row.get("notes"),
        tags=row.get("tags", []),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.patch("/{feedback_id}", response_model=Feedback)
async def update_feedback(feedback_id: UUID, feedback: FeedbackUpdate):
    """Update existing feedback."""
    db = get_db()

    update_data = {"updated_at": datetime.utcnow().isoformat()}

    if feedback.feedback_type is not None:
        update_data["feedback_type"] = feedback.feedback_type
    if feedback.rating is not None:
        update_data["rating"] = feedback.rating
    if feedback.notes is not None:
        update_data["notes"] = feedback.notes
    if feedback.tags is not None:
        update_data["tags"] = feedback.tags

    response = (
        db.table("feedback")
        .update(update_data)
        .eq("id", str(feedback_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Feedback not found")

    row = response.data[0]
    return Feedback(
        id=row["id"],
        sample_id=row["sample_id"],
        feedback_type=row["feedback_type"],
        rating=row.get("rating"),
        notes=row.get("notes"),
        tags=row.get("tags", []),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.delete("/{feedback_id}")
async def delete_feedback(feedback_id: UUID):
    """Delete feedback."""
    db = get_db()

    response = db.table("feedback").delete().eq("id", str(feedback_id)).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return {"message": "Feedback deleted successfully"}


@router.get("/stats")
async def get_feedback_stats():
    """Get aggregate feedback statistics."""
    db = get_db()

    response = db.table("feedback").select("feedback_type, rating").execute()

    stats = {"total": len(response.data), "by_type": {}, "by_rating": {}}

    for row in response.data:
        feedback_type = row.get("feedback_type")
        if feedback_type:
            stats["by_type"][feedback_type] = stats["by_type"].get(feedback_type, 0) + 1

        rating = row.get("rating")
        if rating:
            stats["by_rating"][rating] = stats["by_rating"].get(rating, 0) + 1

    return stats
