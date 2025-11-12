import json
import os
import re
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path

from ..database import get_db
from ..config import settings


def parse_filename(filename: str) -> Dict[str, Any]:
    """
    Parse metadata from filename.
    Expected format: {eval_type}_{model}_{config}_temp{temp}_{timestamp}_allresults.json
    Example: polymarket_openai__gpt-oss-20b-high_temp1.0_20251112_025328_allresults.json
    """
    metadata = {"eval_type": None, "model_name": None, "timestamp": None}

    filename = filename.replace("_allresults.json", "")
    parts = filename.split("_")

    if len(parts) >= 1:
        metadata["eval_type"] = parts[0]

    for i, part in enumerate(parts):
        if part.startswith("temp"):
            if i > 0:
                metadata["model_name"] = "_".join(parts[1:i])

            timestamp_parts = parts[i + 1 : i + 3]
            if len(timestamp_parts) == 2:
                try:
                    timestamp_str = timestamp_parts[0] + timestamp_parts[1]
                    metadata["timestamp"] = datetime.strptime(
                        timestamp_str, "%Y%m%d%H%M%S"
                    )
                except ValueError:
                    pass
            break

    return metadata


def validate_result_file(data: Dict[str, Any]) -> bool:
    """Validate that the result file has the expected structure."""
    required_keys = ["score", "metrics", "htmls", "convos", "metadata"]
    return all(key in data for key in required_keys)


async def ingest_file(file_path: str) -> Dict[str, Any]:
    """
    Ingest a single result file into the database.

    Returns dict with status: 'success', 'skipped', or 'error' and optional message.
    """
    db = get_db()

    try:
        with open(file_path, "r") as f:
            data = json.load(f)
    except Exception as e:
        return {"status": "error", "message": f"Failed to read file: {str(e)}"}

    if not validate_result_file(data):
        return {"status": "error", "message": "Invalid file structure"}

    filename = os.path.basename(file_path)
    parsed_metadata = parse_filename(filename)

    existing = (
        db.table("eval_runs")
        .select("id")
        .eq("file_path", file_path)
        .execute()
    )

    if existing.data:
        return {"status": "skipped", "message": "File already ingested"}

    eval_run_data = {
        "name": filename.replace("_allresults.json", ""),
        "model_name": parsed_metadata.get("model_name"),
        "eval_type": parsed_metadata.get("eval_type"),
        "timestamp": (
            parsed_metadata.get("timestamp") or datetime.now()
        ).isoformat(),
        "overall_score": data.get("score"),
        "metrics": data.get("metrics", {}),
        "metadata": data.get("metadata", {}),
        "file_path": file_path,
    }

    eval_run_response = db.table("eval_runs").insert(eval_run_data).execute()

    if not eval_run_response.data:
        return {"status": "error", "message": "Failed to create eval run"}

    eval_run_id = eval_run_response.data[0]["id"]

    htmls = data.get("htmls", [])
    convos = data.get("convos", [])
    example_metadata_list = data.get("metadata", {}).get("example_level_metadata", [])

    samples = []
    for i, (html, convo) in enumerate(zip(htmls, convos)):
        example_metadata = (
            example_metadata_list[i] if i < len(example_metadata_list) else {}
        )

        question = example_metadata.get("question", "")
        if not question and convo:
            for msg in convo:
                if msg.get("role") == "user":
                    content = msg.get("content", "")
                    if isinstance(content, str) and "Question:" in content:
                        question = content.split("Question:")[1].split("\n")[0].strip()
                        break

        sample_metrics = {}
        for key, value in data.get("metrics", {}).items():
            if not key.endswith(":std") and not key.endswith(":min") and not key.endswith(":max"):
                sample_metrics[key] = value

        sample_data = {
            "eval_run_id": eval_run_id,
            "sample_index": i,
            "question": question,
            "score": data.get("score"),
            "metrics": sample_metrics,
            "conversation": convo,
            "html_report": html,
            "example_metadata": example_metadata,
        }
        samples.append(sample_data)

    batch_size = 100
    for i in range(0, len(samples), batch_size):
        batch = samples[i : i + batch_size]
        db.table("eval_samples").insert(batch).execute()

    return {
        "status": "success",
        "message": f"Ingested {len(samples)} samples",
        "eval_run_id": eval_run_id,
    }


async def ingest_files(file_paths: List[str]) -> Dict[str, Any]:
    """Ingest multiple files and return summary."""
    results = {"ingested": 0, "skipped": 0, "errors": []}

    for file_path in file_paths:
        if not os.path.exists(file_path):
            results["errors"].append(f"{file_path}: File not found")
            continue

        result = await ingest_file(file_path)

        if result["status"] == "success":
            results["ingested"] += 1
        elif result["status"] == "skipped":
            results["skipped"] += 1
        else:
            results["errors"].append(f"{file_path}: {result['message']}")

    return results


async def scan_and_ingest(directory: str) -> Dict[str, Any]:
    """Scan directory for result files and ingest them."""
    if not os.path.exists(directory):
        return {"ingested": 0, "skipped": 0, "errors": [f"Directory not found: {directory}"]}

    file_paths = []
    for filename in os.listdir(directory):
        if filename.endswith("_allresults.json"):
            file_paths.append(os.path.join(directory, filename))

    return await ingest_files(file_paths)


if __name__ == "__main__":
    import sys
    import asyncio

    if len(sys.argv) < 2:
        print("Usage: python -m backend.scripts.ingest_results <file_path> [<file_path2> ...]")
        print("   or: python -m backend.scripts.ingest_results --scan-dir <directory>")
        sys.exit(1)

    if sys.argv[1] == "--scan-dir":
        directory = sys.argv[2] if len(sys.argv) > 2 else settings.results_dir
        result = asyncio.run(scan_and_ingest(directory))
    else:
        file_paths = sys.argv[1:]
        result = asyncio.run(ingest_files(file_paths))

    print(f"Ingestion complete:")
    print(f"  Ingested: {result['ingested']}")
    print(f"  Skipped: {result['skipped']}")
    if result['errors']:
        print(f"  Errors: {len(result['errors'])}")
        for error in result['errors']:
            print(f"    - {error}")
