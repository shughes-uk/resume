data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "cors_s3origin" {
  name = "Managed-CORS-S3Origin"
}

data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

module "resume_cdn" {
  source              = "terraform-aws-modules/cloudfront/aws"
  version             = "6.7.1"
  aliases             = [local.domain_name, "www.${local.domain_name}"]
  is_ipv6_enabled     = true
  comment             = "CloudFront distribution for the resume site."
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin_access_control = {
    s3_oac = {
      origin_type      = "s3"
      signing_behavior = "always"
      signing_protocol = "sigv4"
    }
  }

  origin = {
    s3 = {
      domain_name               = module.resume_s3_bucket.s3_bucket_bucket_domain_name
      origin_access_control_key = "s3_oac"
    }
  }

  default_cache_behavior = {
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"

    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.cors_s3origin.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    compress                   = true
  }

  # Missing paths show the landing page, but keep the 404 status so broken
  # asset links and stale URLs are visible as errors.
  custom_error_response = [
    {
      response_page_path = "/index.html"
      error_code         = 404
      response_code      = 404
    }
  ]

  viewer_certificate = {
    cloudfront_default_certificate = false
    acm_certificate_arn            = aws_acm_certificate.main.arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }
}
