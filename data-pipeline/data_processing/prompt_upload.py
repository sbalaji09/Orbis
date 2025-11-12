import os
import boto3
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

# S3Uploader class that allows for us to upload prompts to the S3 Buckets for prompts
class S3Uploader:
    # define the key values for the S3 bucket including the bucket_name, the aws_region, and the s3_client
    def __init__(self):
        self.bucket_name = os.getenv('S3_BUCKET_NAME', 'orbis-prompts-bucket')
        aws_region = os.getenv('AWS_REGION', 'us-east-1')

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
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
            key = f"prompts/{user_id}/{trace_id}/{content_type}/{span_id}_{timestamp}.txt"

            # puts the specific object with user_id, trace_id, span_id, and content_type into the s3 bucket
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=content.encode('utf-8'),
                ContentType='text/plain',
                Metadata={
                    'user_id': user_id,
                    'trace_id': trace_id,
                    'span_id': span_id,
                    'content_type': content_type

                }
            )

            s3_url = f"s3://{self.bucket_name}/{key}"
            print(f"✓ Uploaded {content_type} to {s3_url}")

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



