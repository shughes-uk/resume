# PR previews: each pull request is deployed to s3://shughes-resume-previews/pr-<N>/ and
# served at https://pr-<N>.preview.samanthahughes.me. The bucket, distribution and deploy
# role are separate from production so a PR branch can never write to the live site.

locals {
  preview_domain_name = "preview.${local.domain_name}"
}

module "preview_s3_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "5.16.1"

  bucket        = "shughes-resume-previews"
  force_destroy = true

  # Backstop in case the cleanup workflow ever fails to delete a closed PR's preview
  lifecycle_rule = [{
    id      = "expire-previews"
    enabled = true
    filter  = {}
    expiration = {
      days = 30
    }
  }]
}

data "aws_iam_policy_document" "preview_s3_policy" {
  statement {
    actions = ["s3:GetObject", "s3:ListBucket"]
    resources = [
      "${module.preview_s3_bucket.s3_bucket_arn}/*",
      module.preview_s3_bucket.s3_bucket_arn,
    ]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [module.preview_cdn.cloudfront_distribution_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "preview" {
  bucket = module.preview_s3_bucket.s3_bucket_id
  policy = data.aws_iam_policy_document.preview_s3_policy.json
}

resource "aws_acm_certificate" "preview" {
  domain_name       = "*.${local.preview_domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "preview_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.preview.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "preview" {
  certificate_arn         = aws_acm_certificate.preview.arn
  validation_record_fqdns = [for record in aws_route53_record.preview_cert_validation : record.fqdn]
}

# Maps pr-<N>.preview.samanthahughes.me/<path> to /pr-<N>/<path> in the bucket
resource "aws_cloudfront_function" "preview_router" {
  name    = "resume-preview-router"
  runtime = "cloudfront-js-2.0"
  comment = "Route PR preview subdomains to their S3 prefix"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      var match = request.headers.host.value.match(/^(pr-[0-9]+)\.preview\.samanthahughes\.me$/);
      if (!match) {
        return { statusCode: 404, statusDescription: "Not Found" };
      }
      var uri = request.uri === "/" ? "/index.html" : request.uri;
      request.uri = "/" + match[1] + uri;
      return request;
    }
  EOT
}

resource "aws_cloudfront_response_headers_policy" "preview" {
  name    = "resume-preview"
  comment = "Security headers plus noindex for PR previews"

  custom_headers_config {
    items {
      header   = "X-Robots-Tag"
      value    = "noindex, nofollow"
      override = true
    }
  }

  security_headers_config {
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "SAMEORIGIN"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      override                   = true
    }
  }
}

module "preview_cdn" {
  source              = "terraform-aws-modules/cloudfront/aws"
  version             = "6.7.1"
  aliases             = ["*.${local.preview_domain_name}"]
  comment             = "CloudFront distribution for resume PR previews."
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin_access_control = {
    preview_oac = {
      origin_type      = "s3"
      signing_behavior = "always"
      signing_protocol = "sigv4"
    }
  }

  origin = {
    s3 = {
      domain_name               = module.preview_s3_bucket.s3_bucket_bucket_domain_name
      origin_access_control_key = "preview_oac"
    }
  }

  # The router rewrites the URI before the cache lookup, so each PR gets its own cache
  # entries. index.html is uploaded with no-cache and assets are fingerprinted, so
  # previews never need an invalidation.
  default_cache_behavior = {
    target_origin_id           = "s3"
    viewer_protocol_policy     = "redirect-to-https"
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.cors_s3origin.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.preview.id
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    compress                   = true

    function_association = {
      viewer-request = {
        function_arn = aws_cloudfront_function.preview_router.arn
      }
    }
  }

  viewer_certificate = {
    cloudfront_default_certificate = false
    acm_certificate_arn            = aws_acm_certificate_validation.preview.certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }
}

resource "aws_route53_record" "preview" {
  for_each = toset(["A", "AAAA"])

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "*.${local.preview_domain_name}"
  type    = each.value
  alias {
    name                   = module.preview_cdn.cloudfront_distribution_domain_name
    zone_id                = module.preview_cdn.cloudfront_distribution_hosted_zone_id
    evaluate_target_health = false
  }
}
