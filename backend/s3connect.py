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