# Samantha Hughes's Resume

[![Deployment](https://github.com/shughes-uk/resume/actions/workflows/deploy.yml/badge.svg)](https://d3k3m107rwvrzt.cloudfront.net/)

## Getting Started

The repo uses [pixi](https://prefix.dev/docs/pixi/overview). Install it with

```shell
curl -fsSL https://pixi.sh/install.sh | bash
```

Then install everything you'll need

```shell
pixi install
pixi run frontend-install
```

Add the precommit with

```shell
pre-commit install
```

Start the frontend dev server with

```shell
pixi run frontend-dev
```

Start hacking!

## Deployment

All pushes to main are immediately deployed!

## Terraform

Infrastructure lives in `terraform/`. State is stored in the `shughes-resume-tfstate` S3 bucket
(`us-east-1`, versioned) under `resume/terraform.tfstate`, with S3-native locking. The bucket was
created by hand and is not managed by this config.

Pull requests get a plan posted as a comment. Applies are run locally:

```shell
pixi run terraform-plan
pixi run terraform-apply
```
