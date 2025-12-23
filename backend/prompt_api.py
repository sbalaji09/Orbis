import os
from db_connection import db
from fastapi import APIRouter, HTTPException, Header, Depends, Query
from s3connect import *
import hashlib
from llm_service import get_llm_comparison_analysis
from auth_utils import get_auth_context, get_user_id_from_auth
from semantic_versioning import SemanticVersionAnalyzer, get_next_version

router = APIRouter(
    prefix="/prompts",
    tags=["prompts"]
)

def _require_agent_owner(user_id: str, agent_id: str) -> None:
    try:
        db.assert_user_owns_agent(user_id, agent_id)
    except Exception:
        raise HTTPException(status_code=403, detail="Access denied")


@router.post("/prompts")
async def create_prompt(
    agent_id: str,
    name: str,
    content: str,
    auth: dict = Depends(get_auth_context),
):
    """
    Create a new prompt version with automatic semantic versioning.
    Detects if changes are major (2.0) or minor (1.1) based on content analysis.
    """
    # generate hash for content
    content_hash = compute_hash_sha256(content)

    try:
        user_id = auth.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # If authenticated via API key and we know which agent it belongs to, lock prompts to that agent.
        if auth.get("auth_type") == "api_key" and auth.get("agent_id") and str(agent_id) != str(auth["agent_id"]):
            raise HTTPException(status_code=403, detail="Access denied")

        # Ensure user can only write prompts for their own agents
        _require_agent_owner(user_id, agent_id)

        # Check if prompt with identical hash already exists
        if db.check_identical_hash(content_hash, agent_id, user_id):
            # Return the existing prompt instead of creating duplicate
            existing_prompt = db.get_prompt_by_hash(content_hash, agent_id, user_id)
            if existing_prompt:
                return existing_prompt
            # If not found, continue to create new one
            pass

        bucket_name = os.getenv('S3_BUCKET_NAME')
        aws_region = os.getenv('AWS_REGION')

        # Get version info including latest content for semantic analysis
        version_info = db.max_version_prompt_number(name, agent_id, user_id)
        version_number = version_info["Version number"]
        latest_semantic_version = version_info.get("semantic_version", "0.0")
        latest_content = version_info.get("latest_content", "")

        # Determine semantic version based on content changes
        semantic_version = None
        if latest_content and latest_content.strip():
            # Auto-detect version based on changes
            new_semantic_version, change_analysis = get_next_version(
                latest_semantic_version,
                latest_content,
                content
            )
            semantic_version = new_semantic_version

            # Log the change analysis
            print(
                f"Auto-versioning: {latest_semantic_version} -> {semantic_version} ({change_analysis.change_type} change)")
            print(f"  - Diff ratio: {change_analysis.diff_ratio:.2%}")
            print(
                f"  - Structural changes: {change_analysis.structural_changes}")
            print(f"  - Semantic changes: {change_analysis.semantic_changes}")
        else:
            # First version
            semantic_version = "1.0"

        if bucket_name:
            try:
                s3URL = upload_prompt_to_s3(
                    content, bucket_name, name, version_number, aws_region)
            except Exception as e:
                print(f"S3 upload failed: {e}, using None")
                s3URL = None
        else:
            s3URL = None

        prompt_version = db.insert_prompt_row(
            name, version_number, s3URL, agent_id,
            content_hash, content[:min(500, len(content))],
            semantic_version=semantic_version
        )
        return prompt_version
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Static routes must come before dynamic routes


@router.get("/families")
async def get_all_prompt_families(user_id: str = Depends(get_user_id_from_auth)):
    try:
        print(f"Fetching prompt families for user_id: {user_id}")
        families = db.get_all_prompt_families(user_id)
        print(f"Found {len(families)} families")
        return {"families": families}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching prompt families: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/diff")
async def get_prompt_differences(
    prompt_id1: str,
    prompt_id2: str,
    user_id: str = Depends(get_user_id_from_auth),
):
    try:
        # Get prompt records with both s3_url and content_preview
        conn = db.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT pv.prompt_id, pv.s3_url, pv.content_preview
                    FROM prompt_versions pv
                    LEFT JOIN agents a ON pv.agent_id = a.agent_id
                    WHERE pv.prompt_id IN (%s, %s)
                    AND (
                        pv.agent_id IS NULL
                        OR a.user_id = %s
                    )
                """
                cur.execute(query, (prompt_id1, prompt_id2, user_id))
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
            content1 = download_prompt_from_s3(s3_url1)

        if not s3_url2 or (s3_url2 and s3_url2.startswith("placeholder://")):
            content2 = prompt_data[prompt_id2]["content_preview"]
        else:
            content2 = download_prompt_from_s3(s3_url2)

        return prompt_diff(content1, prompt_id1, content2, prompt_id2)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agent/{agent_id}")
async def get_prompt_by_agent_id(
    agent_id: str,
    auth: dict = Depends(get_auth_context),
):
    try:
        user_id = auth.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # If authenticated via API key and we know which agent it belongs to, lock reads to that agent.
        if auth.get("auth_type") == "api_key" and auth.get("agent_id") and str(agent_id) != str(auth["agent_id"]):
            raise HTTPException(status_code=403, detail="Access denied")

        _require_agent_owner(user_id, agent_id)
        prompt_families = db.get_prompts_by_agent_id(agent_id, user_id)
        return prompt_families
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{name}/versions")
async def get_version_numbers(
    name: str,
    agent_id: str | None = Query(None, description="Optional agent_id to scope versions"),
    auth: dict = Depends(get_auth_context),
):
    try:
        user_id = auth.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        if auth.get("auth_type") == "api_key" and auth.get("agent_id"):
            # API key auth can only access its own agent-scoped prompts
            if agent_id is None or str(agent_id) != str(auth["agent_id"]):
                raise HTTPException(status_code=403, detail="Access denied")

        if agent_id is not None:
            _require_agent_owner(user_id, agent_id)
        prompt_versions = db.get_prompts_versions(name, user_id, agent_id=agent_id)
        return {"versions": prompt_versions}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{name}/content")
async def get_prompt_content(
    name: str,
    semantic_version: str | None = Query(None, description="Semantic version (e.g., 1.2)"),
    version_number: int | None = Query(None, description="Integer version number (legacy)"),
    agent_id: str | None = Query(None, description="Optional agent_id to scope prompt"),
    auth: dict = Depends(get_auth_context),
):
    try:
        user_id = auth.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        if auth.get("auth_type") == "api_key" and auth.get("agent_id"):
            if agent_id is None or str(agent_id) != str(auth["agent_id"]):
                raise HTTPException(status_code=403, detail="Access denied")

        if agent_id is not None:
            _require_agent_owner(user_id, agent_id)

        prompt_record = None
        if version_number is not None:
            prompt_record = db.get_prompt_version(name, version_number, user_id, agent_id=agent_id)
        else:
            # If no semantic_version provided, get the latest version
            if semantic_version is None:
                versions = db.get_prompts_versions(name, user_id, agent_id=agent_id)
                if not versions:
                    raise HTTPException(
                        status_code=404, detail="No versions found for this prompt")
                semantic_version = versions[0]["semantic_version"]

            prompt_record = db.get_prompt_by_semantic_version(
                name, semantic_version, user_id, agent_id=agent_id)

        if not prompt_record:
            raise HTTPException(
                status_code=404, detail=f"Version {semantic_version} not found for prompt '{name}'")

        s3_url = prompt_record.get("s3_url")

        # If no S3 URL or placeholder URL (optional S3), return content_preview from database
        if not s3_url or (s3_url and s3_url.startswith("placeholder://")):
            content = prompt_record.get("content_preview", "")
            return {"content": content}

        # Otherwise download from S3
        content = download_prompt_from_s3(s3_url)
        return {"content": content}
    except HTTPException:
        raise  # Re-raise HTTPException as-is (don't convert to 500)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{name}/rollback")
async def rollback_prompt(
    name: str,
    semantic_version: str,
    agent_id: str | None = Query(None, description="Optional agent_id to scope rollback"),
    auth: dict = Depends(get_auth_context),
):
    """
    Rollback to a previous version by creating a new version with the old content.
    Maintains semantic versioning by incrementing as a minor change.
    """
    try:
        user_id = auth.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        if auth.get("auth_type") == "api_key" and auth.get("agent_id"):
            if agent_id is None or str(agent_id) != str(auth["agent_id"]):
                raise HTTPException(status_code=403, detail="Access denied")

        if agent_id is not None:
            _require_agent_owner(user_id, agent_id)
        prompt_rollback = db.get_prompt_by_semantic_version(
            name, semantic_version, user_id, agent_id=agent_id)
        if not prompt_rollback:
            raise HTTPException(
                status_code=404,
                detail=f"Version {semantic_version} not found for prompt '{name}'"
            )

        if not prompt_rollback.get("agent_id"):
            raise HTTPException(status_code=403, detail="Rollback not allowed for global prompts")

        db.deactivate_version_by_semantic(
            name,
            semantic_version,
            user_id,
            agent_id=str(prompt_rollback["agent_id"]),
        )

        # Get current version info for semantic versioning
        version_info = db.max_version_prompt_number(
            name, str(prompt_rollback["agent_id"]), user_id
        )
        new_version_number = version_info["Version number"]
        current_semantic = version_info.get("semantic_version", "1.0")

        # Parse current semantic version and increment minor
        from semantic_versioning import SemanticVersionAnalyzer
        analyzer = SemanticVersionAnalyzer()
        major, minor = analyzer.parse_version(current_semantic)
        new_semantic = analyzer.format_version(major, minor + 1)

        new_version = db.insert_prompt_row(
            name,
            new_version_number,
            prompt_rollback["s3_url"],
            prompt_rollback["agent_id"],
            prompt_rollback["prompt_hash"],
            prompt_rollback["content_preview"],
            parent_version_id=str(prompt_rollback["prompt_id"]),
            semantic_version=new_semantic
        )
        return {
            "name": name,
            "rolled_back_to_semantic_version": semantic_version,
            "new_version_number": new_version_number,
            "new_semantic_version": new_semantic,
            "new_version_id": new_version["prompt_id"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/{prompt_name}")
async def get_prompt_analytics(
    prompt_name: str,
    agent_id: str | None = Query(None, description="Optional agent_id to scope analytics"),
    auth: dict = Depends(get_auth_context),
):
    try:
        user_id = auth.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        if auth.get("auth_type") == "api_key" and auth.get("agent_id"):
            if agent_id is None or str(agent_id) != str(auth["agent_id"]):
                raise HTTPException(status_code=403, detail="Access denied")

        if agent_id is not None:
            _require_agent_owner(user_id, agent_id)
        analytics = db.get_prompt_analytics(prompt_name, user_id, agent_id=agent_id)
        return {"prompt_name": prompt_name, "versions": analytics}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare")
async def compare_prompt_analytics(
    prompt_id1: str,
    prompt_id2: str,
    user_id: str = Depends(get_user_id_from_auth),
):
    try:
        # Validate UUIDs early so DB errors don't surface as 500s
        import uuid

        try:
            prompt_id1 = str(uuid.UUID(str(prompt_id1)))
            prompt_id2 = str(uuid.UUID(str(prompt_id2)))
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="prompt_id1 and prompt_id2 must be valid UUIDs",
            )

        # Get prompt records with both s3_url and content_preview
        conn = db.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT pv.prompt_id, pv.s3_url, pv.content_preview
                    FROM prompt_versions pv
                    WHERE pv.prompt_id IN (%s, %s)
                    AND (
                        pv.agent_id IS NULL
                        OR EXISTS (
                            SELECT 1
                            FROM agents a
                            WHERE a.agent_id = pv.agent_id
                            AND a.user_id = %s
                        )
                    )
                """
                cur.execute(query, (prompt_id1, prompt_id2, user_id))
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
            prompt1_content = download_prompt_from_s3(s3_url1)

        if not s3_url2 or (s3_url2 and s3_url2.startswith("placeholder://")):
            prompt2_content = prompt_data[prompt_id2]["content_preview"]
        else:
            prompt2_content = download_prompt_from_s3(s3_url2)

        # get analytics for both prompts
        analytics_list = db.get_prompt_analytics_for_prompt_ids(
            prompt_id1, prompt_id2, user_id
        )
        analytics1 = next((a for a in analytics_list if str(
            a['prompt_id']) == prompt_id1), {})
        analytics2 = next((a for a in analytics_list if str(
            a['prompt_id']) == prompt_id2), {})

        # get sample outputs for each version
        outputs1 = db.get_output_preview(prompt_id1, user_id, limit=5)
        outputs2 = db.get_output_preview(prompt_id2, user_id, limit=5)

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
    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


def compute_hash_sha256(content: str) -> str:
    hash_object = hashlib.sha256(content.encode("utf-8"))
    return hash_object.hexdigest()
