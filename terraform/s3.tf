module "resume_s3_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "5.16.1"

  bucket        = "shughes-resume-frontend-bucket"
  force_destroy = true
  cors_rule = [{
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = [local.domain_name]
    expose_headers  = []
  }]
}

data "aws_iam_policy_document" "s3_policy" {

  # Origin Access Controls
  statement {
    actions = [
      "s3:GetObject",
      "s3:ListBucket"
    ]
    resources = [
      "${module.resume_s3_bucket.s3_bucket_arn}/*",
      module.resume_s3_bucket.s3_bucket_arn
    ]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [module.resume_cdn.cloudfront_distribution_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "bucket_policy" {
  bucket = module.resume_s3_bucket.s3_bucket_id
  policy = data.aws_iam_policy_document.s3_policy.json
}
