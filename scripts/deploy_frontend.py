import mimetypes
import sys
import time
from concurrent.futures import ThreadPoolExecutor, wait
from pathlib import Path

import boto3
import click


def get_ssm_parameter(name):
    # get ssm parameter
    client = boto3.client("ssm", region_name="us-east-1")
    response = client.get_parameter(Name=name)
    return response["Parameter"]["Value"]


def upload_file_to_s3(parent: Path, file: Path, bucket: str, subdir: Path, s3):
    if file.is_file():
        # detect content type
        content_type = mimetypes.guess_type(str(file))[0]
        if content_type is None:
            content_type = "application/octet-stream"
        fp = (
            str(subdir / file.relative_to(parent))
            if subdir
            else str(file.relative_to(parent))
        )
        s3.upload_file(
            Filename=str(file),
            Bucket=bucket,
            Key=fp,
            ExtraArgs={"ContentType": content_type},
        )
        click.echo(f"Uploaded {file} to s3://{bucket}/{fp}")


def upload_directory_to_s3(bucket: str, path: Path, subdir: Path = Path(".")):
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = []
        client = boto3.client("s3")
        for file in path.rglob("*"):
            future = executor.submit(
                upload_file_to_s3, path, file, bucket, subdir, client
            )
            futures.append(future)

        # Wait for all futures to complete
        wait(futures)


def create_cloudfront_invalidation(distribution_id: str):
    client = boto3.client("cloudfront")
    client.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            "Paths": {"Quantity": 1, "Items": ["/*"]},
            "CallerReference": time.strftime("%Y%m%d%H%M%S"),
        },
    )
    click.echo(f"Created CloudFront invalidation for {distribution_id}")


@click.command()
def deploy_frontend():
    click.echo("Deploying frontend")
    path = Path("frontend/dist")
    if not path.exists():
        click.echo(f"{path} is not built. Run `pixi run frontend-build`")
        sys.exit(1)
    target_bucket = get_ssm_parameter("/resume/s3/bucket")
    upload_directory_to_s3(target_bucket, path)
    # reset cloudfront distribution
    cloudfront_distribution_id = get_ssm_parameter("/resume/cdn/distribution_id")
    create_cloudfront_invalidation(cloudfront_distribution_id)
    click.echo("Deployment complete")


if __name__ == "__main__":
    deploy_frontend.main()
