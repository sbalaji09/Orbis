import os
import gzip
import hashlib
import base64
import boto3
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from dotenv import load_dotenv
import redis

load_dotenv()

# Thresholds for cost optimization
MIN_SIZE_FOR_S3_UPLOAD = int(os.getenv('MIN_SIZE_FOR_S3_UPLOAD', 1024))  # 1KB default
COMPRESSION_THRESHOLD = int(os.getenv('COMPRESSION_THRESHOLD', 5120))    # 5KB default

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0,
    decode_responses=True,  # returns str instead of bytes
)

# S3Uploader class that allows for us to upload prompts to the S3 Buckets for prompts
class S3Uploader:
    # define the key values for the S3 bucket including the bucket_name, the aws_region, and the s3_client
    def __init__(self):
        self.bucket_name = os.getenv('S3_BUCKET_NAME', 'orbis-prompts-bucket')
        aws_region = os.getenv('AWS_REGION', 'us-west-1')

        self.s3_client = boto3.client(
            's3',
            region_name=aws_region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )

        print(f"✓ S3 Uploader initialized - Bucket: {self.bucket_name}")
    
    # upload the prompt to the s3 bucket and return the url link for the prompt
    def upload_prompt(self, user_id: str, trace_id: str, span_id: str, content: str, content_type: str = 'input') -> str:
        try:
            if len(content) < MIN_SIZE_FOR_S3_UPLOAD:
                # Store small blobs in Redis and return a short reference.
                # This avoids embedding base64 directly into the URL (which can exceed DB VARCHAR limits).
                hash_value = hashlib.sha256(content.encode()).hexdigest()
                redis_client.set(f"inline_blob:{hash_value}", content)
                return f"inline://sha256:{hash_value}"
            
            hash_value = hashlib.sha256(content.encode()).hexdigest()
            cache_key = f"s3:hash:{hash_value}"

            cached_url = redis_client.get(cache_key)
            if cached_url:
                return cached_url
            
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
            key = f"prompts/{user_id}/{trace_id}/{content_type}/{span_id}_{timestamp}.txt"

            raw_bytes = content.encode("utf-8")
            body = raw_bytes

            s3_content_type = "text/plain; charset=utf-8"
            content_encoding = None

            if len(content) > COMPRESSION_THRESHOLD:
                body = gzip.compress(raw_bytes)
                key = key[0:-4] + ".txt.gz"
                content_encoding = "gzip"

            # puts the specific object with user_id, trace_id, span_id, and content_type into the s3 bucket
            put_args = dict(
                Bucket=self.bucket_name,
                Key=key,
                Body=body,
                ContentType=s3_content_type,
                Metadata={
                    "user_id": str(user_id),
                    "trace_id": str(trace_id),
                    "span_id": str(span_id),
                    "logical_content_type": str(content_type),  # preserve your path semantics
                },
            )

            if content_encoding:
                put_args["ContentEncoding"] = content_encoding

            self.s3_client.put_object(**put_args)

            s3_url = f"s3://{self.bucket_name}/{key}"
            redis_client.set(cache_key, s3_url)
            return s3_url
        
        except ClientError as e:
            error_msg = f"Failed to upload to S3: {e}"
            print(f"✗ {error_msg}")
            raise Exception(error_msg)
    
    # generates the presigned url which allows for shared direct access to the bucket without revealing your secret
    def generate_presigned_url(self, s3_url: str, expiration: int = 3600) -> str:
        try:
            # parse s3 url
            if not s3_url.startswith('s3://'):
                raise ValueError(f"Invalid S3 URL: {s3_url}")
            
            # extract the bucket and the key
            parts = s3_url[5:].split('/', 1)
            bucket = parts[0]
            key = parts[1] if len(parts) > 1 else ''
            
            # generate presigned URL
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket,
                    'Key': key
                },
                ExpiresIn=expiration
            )
            
            return url
        except ClientError as e:
            error_msg = f"Failed to generate presigned URL: {e}"
            print(f"✗ {error_msg}")
            raise Exception(error_msg)

# single instance of the uploader       
uploader = S3Uploader()

# helper function for uploading the input
def upload_input(user_id: str, trace_id: str, span_id: str, content: str) -> str:
    return uploader.upload_prompt(user_id, trace_id, span_id, content, 'input')

# helper function for uploading the output
def upload_output(user_id: str, trace_id: str, span_id: str, content: str) -> str:
    return uploader.upload_prompt(user_id, trace_id, span_id, content, 'output')

def decode_blob_url(blob_url: str) -> str:
    """
    Decode a blob URL to get the content.
    - For inline://sha256:<hash> URLs, fetch content from Redis
    - For inline:// URLs, decode the base64 content directly (legacy)
    - For s3:// URLs, return as-is (caller should fetch from S3)
    - For other URLs, return as-is

    Returns the decoded content for inline URLs, or the original URL for others.
    """
    if blob_url and blob_url.startswith('inline://sha256:'):
        hash_value = blob_url[len('inline://sha256:'):]
        if hash_value:
            cached_content = redis_client.get(f"inline_blob:{hash_value}")
            if cached_content is not None:
                return cached_content
        return ""
    if blob_url and blob_url.startswith('inline://'):
        encoded_content = blob_url[9:]  # Remove 'inline://' prefix
        return base64.b64decode(encoded_content).decode('utf-8')
    return blob_url

def is_inline_url(blob_url: str) -> bool:
    """Check if a blob URL is an inline URL (content embedded in the URL)."""
    return blob_url and blob_url.startswith('inline://')

# Test the uploader
if __name__ == "__main__":
    print("\n=== Testing S3 Uploader ===\n")
    
    # Test upload
    try:
        test_content = "This is a test prompt for GPT-4"
        url = upload_input(
            user_id="test_user",
            trace_id="trace_123",
            span_id="span_456",
            content=test_content
        )
        print(f"\n✓ Upload successful: {url}")
        
        # Test presigned URL generation
        presigned = uploader.generate_presigned_url(url)
        print(f"✓ Presigned URL: {presigned[:100]}...")
        
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        print("\nMake sure you have:")
        print("1. AWS credentials configured")
        print("2. S3 bucket created")
        print("3. Proper IAM permissions")
    
    print("\n=== Test Complete ===\n")


