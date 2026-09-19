import mimetypes
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import boto3
import click

DIST = Path("frontend/dist")
# Vite fingerprints everything under assets/, so those files never change once published
IMMUTABLE_CACHE = "public, max-age=31536000, immutable"
# Everything else (index.html, the resume downloads) must be revalidated on each visit
REVALIDATE_CACHE = "no-cache"

mimetypes.add_type("text/javascript", ".js")


def get_ssm_parameter(name: str) -> str:
    client = boto3.client("ssm", region_name="us-east-1")
    response = client.get_parameter(Name=name)
    return response["Parameter"]["Value"]


def upload_files(s3, bucket: str, files: list[Path]) -> None:
    def upload(file: Path) -> None:
        key = file.relative_to(DIST).as_posix()
        content_type = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
        cache_control = (
            IMMUTABLE_CACHE if key.startswith("assets/") else REVALIDATE_CACHE
        )
        s3.upload_file(
            Filename=str(file),
            Bucket=bucket,
            Key=key,
            ExtraArgs={"ContentType": content_type, "CacheControl": cache_control},
        )
        click.echo(f"Uploaded s3://{bucket}/{key} ({content_type})")

    with ThreadPoolExecutor(max_workers=20) as executor:
        # result() re-raises any upload error so a failed upload fails the deploy
        for future in [executor.submit(upload, file) for file in files]:
            future.result()


def invalidate_cloudfront(distribution_id: str) -> None:
    client = boto3.client("cloudfront")
    response = client.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            "Paths": {"Quantity": 1, "Items": ["/*"]},
            "CallerReference": str(time.time_ns()),
        },
    )
    invalidation_id = response["Invalidation"]["Id"]
    click.echo(f"Waiting for CloudFront invalidation {invalidation_id}")
    client.get_waiter("invalidation_completed").wait(
        DistributionId=distribution_id,
        Id=invalidation_id,
        WaiterConfig={"Delay": 10, "MaxAttempts": 60},
    )


def delete_stale_objects(s3, bucket: str, keep: set[str]) -> None:
    stale = []
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket):
        stale += [
            obj["Key"] for obj in page.get("Contents", []) if obj["Key"] not in keep
        ]
    for i in range(0, len(stale), 1000):
        response = s3.delete_objects(
            Bucket=bucket,
            Delete={"Objects": [{"Key": key} for key in stale[i : i + 1000]]},
        )
        if response.get("Errors"):
            raise click.ClickException(f"Failed to delete: {response['Errors']}")
    click.echo(f"Deleted {len(stale)} stale objects")


def smoke_test(site_url: str) -> None:
    def fetch(url: str) -> tuple[int, str, bytes]:
        with urllib.request.urlopen(url, timeout=30) as response:
            return response.status, response.headers.get_content_type(), response.read()

    status, _, body = fetch(site_url)
    scripts = re.findall(rb'src="/(assets/[^"]+\.js)"', body)
    if status != 200 or not scripts:
        raise click.ClickException(
            f"{site_url} returned {status} without an app bundle"
        )
    for script in scripts:
        url = f"{site_url.rstrip('/')}/{script.decode()}"
        status, content_type, _ = fetch(url)
        if status != 200 or content_type != "text/javascript":
            raise click.ClickException(f"{url} returned {status} {content_type}")
    click.echo(f"Smoke test passed for {site_url}")


@click.command()
@click.option("--site-url", default="https://samanthahughes.me", show_default=True)
def deploy_frontend(site_url: str) -> None:
    click.echo("Deploying frontend")
    if not (DIST / "index.html").exists():
        click.echo(f"{DIST} is not built. Run `pixi run frontend-build`")
        sys.exit(1)
    bucket = get_ssm_parameter("/resume/s3/bucket")
    distribution_id = get_ssm_parameter("/resume/cdn/distribution_id")
    s3 = boto3.client("s3")

    files = sorted(file for file in DIST.rglob("*") if file.is_file())
    index = DIST / "index.html"
    assets = [file for file in files if file.parts[len(DIST.parts)] == "assets"]
    others = [file for file in files if file not in assets and file != index]
    # Upload in dependency order so a visitor never gets an index.html that
    # references assets which are not in the bucket yet
    upload_files(s3, bucket, assets)
    upload_files(s3, bucket, others)
    upload_files(s3, bucket, [index])

    invalidate_cloudfront(distribution_id)
    # Only delete old files once no edge can still serve an index.html that uses them
    delete_stale_objects(s3, bucket, {f.relative_to(DIST).as_posix() for f in files})
    smoke_test(site_url)
    click.echo("Deployment complete")


if __name__ == "__main__":
    deploy_frontend.main()
