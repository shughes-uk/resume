
locals {
  domain_name = "samanthahughes.me"
}

data "aws_route53_zone" "main" {
  name = local.domain_name
}

resource "aws_acm_certificate" "main" {
  domain_name               = local.domain_name
  validation_method         = "DNS"
  subject_alternative_names = ["www.${local.domain_name}"]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation_records" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
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

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation_records : record.fqdn]
}

resource "aws_route53_record" "main" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.domain_name
  type    = "A"
  alias {
    name                   = module.resume_cdn.cloudfront_distribution_domain_name
    zone_id                = module.resume_cdn.cloudfront_distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${local.domain_name}"
  type    = "A"
  alias {
    name                   = module.resume_cdn.cloudfront_distribution_domain_name
    zone_id                = module.resume_cdn.cloudfront_distribution_hosted_zone_id
    evaluate_target_health = false
  }
}
