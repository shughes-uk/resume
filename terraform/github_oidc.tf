# Roles assumed by GitHub Actions through OIDC. Each role is scoped to one job:
# the deploy role can only be assumed from the frontend-production environment,
# and the plan role only from pull_request workflows (fork PRs never get an OIDC token).

locals {
  github_repo = "shughes-uk/resume"
}

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_assume_deploy" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${local.github_repo}:environment:frontend-production"]
    }
  }
}

resource "aws_iam_role" "github_deploy_frontend" {
  name                 = "github-deploy-frontend"
  assume_role_policy   = data.aws_iam_policy_document.github_assume_deploy.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "github_deploy_frontend" {
  statement {
    actions   = ["s3:ListBucket"]
    resources = [module.resume_s3_bucket.s3_bucket_arn]
  }
  statement {
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["${module.resume_s3_bucket.s3_bucket_arn}/*"]
  }
  statement {
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [module.resume_cdn.cloudfront_distribution_arn]
  }
  statement {
    actions = ["ssm:GetParameter"]
    resources = [
      aws_ssm_parameter.resume_s3_bucket.arn,
      aws_ssm_parameter.resume_cdn_distribution_id.arn,
    ]
  }
}

resource "aws_iam_role_policy" "github_deploy_frontend" {
  name   = "deploy-frontend"
  role   = aws_iam_role.github_deploy_frontend.id
  policy = data.aws_iam_policy_document.github_deploy_frontend.json
}

data "aws_iam_policy_document" "github_assume_plan" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${local.github_repo}:pull_request"]
    }
  }
}

resource "aws_iam_role" "github_terraform_plan" {
  name                 = "github-terraform-plan"
  assume_role_policy   = data.aws_iam_policy_document.github_assume_plan.json
  max_session_duration = 3600
}

resource "aws_iam_role_policy_attachment" "github_terraform_plan_read_only" {
  role       = aws_iam_role.github_terraform_plan.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

data "aws_iam_policy_document" "github_terraform_plan" {
  # ReadOnlyAccess covers S3 reads, but spell out the state bucket so the
  # plan keeps working if the managed policy changes.
  statement {
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::shughes-resume-tfstate"]
  }
  statement {
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::shughes-resume-tfstate/resume/*"]
  }
}

resource "aws_iam_role_policy" "github_terraform_plan" {
  name   = "terraform-plan"
  role   = aws_iam_role.github_terraform_plan.id
  policy = data.aws_iam_policy_document.github_terraform_plan.json
}

output "github_deploy_frontend_role_arn" {
  value     = aws_iam_role.github_deploy_frontend.arn
  sensitive = true
}

output "github_terraform_plan_role_arn" {
  value     = aws_iam_role.github_terraform_plan.arn
  sensitive = true
}
