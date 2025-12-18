import os
from db_connection import db
from fastapi import APIRouter, HTTPException, Header, Depends
from s3connect import *
import hashlib
from llm_service import get_llm_comparison_analysis
from auth_utils import get_user_id_from_token

router = APIRouter(
    prefix="/prompts",
    tags=["prompts"]
)


@router.post("/prompts")
async def create_prompt(agent_id: str, name: str, content: str):
    # generate hash for content
    content_hash = compute_hash_sha256(content)

    try:
        # Check if prompt with identical hash already exists
        if db.check_identical_hash(content_hash, agent_id):
            # Return the existing prompt instead of empty response
            existing_prompt = db.get_prompt_by_hash(content_hash, agent_id)
            if existing_prompt:
                return existing_prompt
            # If not found, continue to create new one
            pass

        bucket_name = os.getenv('S3_BUCKET_NAME')
        aws_region = os.getenv('AWS_REGION')

        version_number = db.max_version_prompt_number(name)["Version number"]

        if bucket_name:
            try:
                s3URL = upload_prompt_to_s3(
                    content, bucket_name, name, version_number, aws_region)
            except Exception as e:
                print(f"S3 upload failed: {e}, using None")
                s3URL = None
        else:
            s3URL = None

        prompt_version = db.insert_prompt_row(name, version_number, s3URL, agent_id,
                                              content_hash, content[:min(500, len(content))])
        return prompt_version
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Static routes must come before dynamic routes


@router.get("/families")
async def get_all_prompt_families(user_id: str = Depends(get_user_id_from_token)):
    try:
        print(f"Fetching prompt families for user_id: {user_id}")
        families = db.get_all_prompt_families(user_id)
        print(f"Found {len(families)} families")
        return {"families": families}
    except Exception as e:
        print(f"Error fetching prompt families: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/diff")
async def get_prompt_differences(prompt_id1: str, prompt_id2: str):
    try:
        # Get prompt records with both s3_url and content_preview
        conn = db.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT prompt_id, s3_url, content_preview
                    FROM prompt_versions
                    WHERE prompt_id IN (%s, %s)
                """
                cur.execute(query, (prompt_id1, prompt_id2))
                rows = cur.fetchall()

                prompt_data = {}
                for row in rows:
                    prompt_data[str(row[0])] = {
                        "s3_url": row[1],
                        "content_preview": row[2]
                    }
        finally:
            db.return_connection(conn)

        if prompt_id1 not in prompt_data or prompt_id2 not in prompt_data:
            raise HTTPException(
                status_code=404, detail="One or both prompts not found")

        # Get content - use preview if no S3 URL or placeholder, otherwise download from S3
        s3_url1 = prompt_data[prompt_id1]["s3_url"]
        s3_url2 = prompt_data[prompt_id2]["s3_url"]

        if not s3_url1 or (s3_url1 and s3_url1.startswith("placeholder://")):
            content1 = prompt_data[prompt_id1]["content_preview"]
        else:
            try:
                content1 = download_prompt_from_s3(s3_url1)
            except Exception as e:
                print(f"S3 download failed for {s3_url1}: {e}, using content_preview")
                content1 = prompt_data[prompt_id1]["content_preview"]

        if not s3_url2 or (s3_url2 and s3_url2.startswith("placeholder://")):
            content2 = prompt_data[prompt_id2]["content_preview"]
        else:
            try:
                content2 = download_prompt_from_s3(s3_url2)
            except Exception as e:
                print(f"S3 download failed for {s3_url2}: {e}, using content_preview")
                content2 = prompt_data[prompt_id2]["content_preview"]

        return prompt_diff(content1, prompt_id1, content2, prompt_id2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agent/{agent_id}")
async def get_prompt_by_agent_id(agent_id: str):
    try:
        prompt_families = db.get_prompts_by_agent_id(agent_id)
        return prompt_families
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{name}/versions")
async def get_version_numbers(name: str):
    try:
        prompt_versions = db.get_prompts_versions(name)
        return {"versions": prompt_versions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{name}/content")
async def get_prompt_content(name: str, version_number: int | None = None):
    try:
        # If no version_number provided, get the latest version
        if version_number is None:
            versions = db.get_prompts_versions(name)
            if not versions or len(versions) == 0:
                raise HTTPException(
                    status_code=404, detail="No versions found for this prompt")
            version_number = int(versions[0]["version_number"])

        prompt_record = db.get_prompt_version(name, int(version_number))
        if not prompt_record:
            raise HTTPException(
                status_code=404, detail=f"Version {version_number} not found for prompt '{name}'")

        s3_url = prompt_record.get("s3_url")

        # If no S3 URL or placeholder URL (optional S3), return content_preview from database
        if not s3_url or (s3_url and s3_url.startswith("placeholder://")):
            content = prompt_record.get("content_preview", "")
            return {"content": content}

        # Try to download from S3, but fall back to content_preview if credentials are missing
        try:
            content = download_prompt_from_s3(s3_url)
            return {"content": content}
        except Exception as s3_error:
            # If S3 download fails (e.g., missing credentials), fall back to content_preview
            print(f"S3 download failed for {s3_url}: {s3_error}, using content_preview")
            content = prompt_record.get("content_preview", "")
            return {"content": content}
    except HTTPException:
        raise  # Re-raise HTTPException as-is (don't convert to 500)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{name}/rollback")
async def rollback_prompt(name: str, version_number: int):
    try:
        prompt_rollback = db.get_prompt_version(name, version_number)
        db.deactivate_version(name, version_number)
        new_version_number = db.max_version_prompt_number(name)[
            "Version number"]
        new_version = db.insert_prompt_row(
            name,
            new_version_number,
            prompt_rollback["s3_url"],
            prompt_rollback["agent_id"],
            prompt_rollback["prompt_hash"],
            prompt_rollback["content_preview"],
            parent_version_id=str(prompt_rollback["prompt_id"])
        )
        return {
            "name": name,
            "rolled_back_to_version": version_number,
            "new_version_number": new_version_number,
            "new_version_id": new_version["prompt_id"],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/{prompt_name}")
async def get_prompt_analytics(prompt_name: str):
    try:
        analytics = db.get_prompt_analytics(prompt_name)
        return {"prompt_name": prompt_name, "versions": analytics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare")
async def compare_prompt_analytics(prompt_id1: str, prompt_id2: str):
    try:
        # Get prompt records with both s3_url and content_preview
        conn = db.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT prompt_id, s3_url, content_preview
                    FROM prompt_versions
                    WHERE prompt_id IN (%s, %s)
                """
                cur.execute(query, (prompt_id1, prompt_id2))
                rows = cur.fetchall()

                prompt_data = {}
                for row in rows:
                    prompt_data[str(row[0])] = {
                        "s3_url": row[1],
                        "content_preview": row[2]
                    }
        finally:
            db.return_connection(conn)

        if prompt_id1 not in prompt_data or prompt_id2 not in prompt_data:
            raise HTTPException(
                status_code=404, detail="One or both prompts not found")

        # Get content - use preview if no S3 URL or placeholder, otherwise download from S3
        s3_url1 = prompt_data[prompt_id1]["s3_url"]
        s3_url2 = prompt_data[prompt_id2]["s3_url"]

        if not s3_url1 or (s3_url1 and s3_url1.startswith("placeholder://")):
            prompt1_content = prompt_data[prompt_id1]["content_preview"]
        else:
            try:
                prompt1_content = download_prompt_from_s3(s3_url1)
            except Exception as e:
                print(f"S3 download failed for {s3_url1}: {e}, using content_preview")
                prompt1_content = prompt_data[prompt_id1]["content_preview"]

        if not s3_url2 or (s3_url2 and s3_url2.startswith("placeholder://")):
            prompt2_content = prompt_data[prompt_id2]["content_preview"]
        else:
            try:
                prompt2_content = download_prompt_from_s3(s3_url2)
            except Exception as e:
                print(f"S3 download failed for {s3_url2}: {e}, using content_preview")
                prompt2_content = prompt_data[prompt_id2]["content_preview"]

        # get analytics for both prompts
        analytics_list = db.get_prompt_analytics_for_prompt_ids(
            prompt_id1, prompt_id2)
        analytics1 = next((a for a in analytics_list if str(
            a['prompt_id']) == prompt_id1), {})
        analytics2 = next((a for a in analytics_list if str(
            a['prompt_id']) == prompt_id2), {})

        # get sample outputs for each version
        outputs1 = db.get_output_preview(prompt_id1, limit=5)
        outputs2 = db.get_output_preview(prompt_id2, limit=5)

        output_texts1 = [o['output_preview']
                         for o in outputs1 if o['output_preview']]
        output_texts2 = [o['output_preview']
                         for o in outputs2 if o['output_preview']]

        # generate text differences
        diff_result = prompt_diff(
            prompt1_content, prompt_id1, prompt2_content, prompt_id2)

        # call LLM for analysis (optional - gracefully handle missing API key)
        llm_analysis = None
        try:
            if os.getenv("OPENAI_API_KEY"):
                llm_analysis = get_llm_comparison_analysis(
                    prompt1_content=prompt1_content,
                    prompt2_content=prompt2_content,
                    outputs1=output_texts1,
                    outputs2=output_texts2,
                    analytics1=analytics1,
                    analytics2=analytics2
                )
            else:
                llm_analysis = "LLM analysis not available (OPENAI_API_KEY not set)"
        except Exception as llm_error:
            print(f"LLM analysis failed (continuing without it): {llm_error}")
            llm_analysis = f"LLM analysis failed: {str(llm_error)}"

        # return complete comparison
        return {
            "prompts": {
                "version1": {
                    "prompt_id": prompt_id1,
                    "content": prompt1_content,
                    "analytics": analytics1,
                    "sample_outputs": output_texts1
                },
                "version2": {
                    "prompt_id": prompt_id2,
                    "content": prompt2_content,
                    "analytics": analytics2,
                    "sample_outputs": output_texts2
                }
            },
            "diff": diff_result,
            "llm_analysis": llm_analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def compute_hash_sha256(content: str) -> str:
    hash_object = hashlib.sha256(content.encode("utf-8"))
    return hash_object.hexdigest()
