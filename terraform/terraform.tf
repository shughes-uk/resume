terraform {
  backend "s3" {
    bucket       = "shughes-resume-tfstate"
    key          = "resume/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.65"
    }
  }
  required_version = ">= 1.16.0"
}
