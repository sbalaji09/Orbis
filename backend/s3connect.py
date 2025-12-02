import difflib
import json
import uuid
import boto3
from botocore.exceptions import ClientError
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# uploads prompt content to S3 bucket and returns the s3::// URL
def upload_prompt_to_s3(
    prompt_content: str,
    bucket_name: str,
    prompt_name: str,
    version_number: int,
    aws_region: Optional[str] = None,
) -> str:

    # normalize the prompt name
    safe_name = prompt_name.replace(" ", "_").lower()

    object_key = f"prompts/{safe_name}/v{version_number}.txt"

    # create the s3 client to upload the content to
    if aws_region:
        s3_client = boto3.client("s3", region_name=aws_region)
    else:
        s3_client = boto3.client("s3")

    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=prompt_content.encode("utf-8"),
            ContentType="text/plain; charset=utf-8",
        )
    except ClientError as e:
        raise RuntimeError(f"Failed to upload prompt to S3: {e}") from e

    # s3 URI to store
    s3_uri = f"s3://{bucket_name}/{object_key}"
    return s3_uri

# download prompt content from s3 based on s3 url and return the content
def download_prompt_from_s3(s3_uri: str) -> str:
    if not s3_uri.startswith("s3://"):
        raise ValueError("Invalid S3 URI format")

    # parse s3://bucket/key
    _, _, bucket_and_key = s3_uri.partition("s3://")
    bucket, _, key = bucket_and_key.partition("/")

    s3_client = boto3.client("s3")

    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        content = response["Body"].read().decode("utf-8")
        return content

    except ClientError as e:
        raise RuntimeError(f"Failed to download prompt from S3: {e}") from e

def prompt_diff(content1: str, prompt_id1: str, content2: str, prompt_id2: str) -> dict:
    lines1 = content1.splitlines()
    lines2 = content2.splitlines()

    # 4. Generate unified diff
    diff_lines = list(
        difflib.unified_diff(
            lines1,
            lines2,
            fromfile=prompt_id1,
            tofile=prompt_id2,
            lineterm=""  # avoid extra newlines in each entry
        )
    )

    # 5. Build structured diff
    added: list[str] = []
    removed: list[str] = []
    unchanged: list[str] = []

    for line in diff_lines:
        # Skip headers and hunk markers
        if line.startswith(("---", "+++", "@@")):
            continue

        if line.startswith("+"):
            added.append(line[1:])      # strip leading '+'
        elif line.startswith("-"):
            removed.append(line[1:])    # strip leading '-'
        elif line.startswith(" "):
            unchanged.append(line[1:])  # strip leading ' '

    # Optional: include raw unified diff as a single string too
    raw_unified_diff = "\n".join(diff_lines)

    return {
        "prompt_id1": prompt_id1,
        "prompt_id2": prompt_id2,
        "diff": {
            "added": added,
            "removed": removed,
            "unchanged": unchanged,
            "raw": raw_unified_diff,  # remove this if you only want structured
        },
    }

def upload_span_output_to_s3(output_data: dict | str, bucket_name: str, trace_id: str, span_id: str, aws_region: str | None = None) -> str:
    if isinstance(output_data, dict):
        body = json.dumps(output_data).encode("utf-8")
        content_type = "application/json; charset=utf-8"
        extension = "json"
    else:
        body = str(output_data).encode("utf-8")
        content_type = "text/plain; charset=utf-8"
        extension = "txt"

    object_key = f"spans/{trace_id}/{span_id}-{uuid.uuid4().hex}.{extension}"

    s3_client = boto3.client("s3", region_name=aws_region) if aws_region else boto3.client("s3")

    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=body,
            ContentType=content_type,
        )
    except ClientError as e:
        raise RuntimeError(f"Failed to upload span output to S3: {e}") from e

    return f"s3://{bucket_name}/{object_key}"