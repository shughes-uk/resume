# Samantha Hughes

- Phone: +1-512-909-9300
- Email: [shughes.uk@gmail.com](mailto:shughes.uk@gmail.com)
- [Portfolio site](https://samanthahughes.me/)
- [Schedule a meeting](https://calendly.com/shughes-uk/30min)
- LinkedIn: [linkedin.com/in/samantha-hughes-2b8b7716](https://www.linkedin.com/in/samantha-hughes-2b8b7716/)
- GitHub: [github.com/shughes-uk](https://github.com/shughes-uk) and [github.com/samantha-earthmover](https://github.com/samantha-earthmover)
- Portland, Oregon (remote US)

## Summary

Staff software engineer who owns the whole stack, from Kubernetes control planes to the product UI. At Earthmover, built the Kubernetes control plane for customer compute and a cross-region job platform, led a cost program that cut the AWS run rate about 45%, and got the whole team debugging production with AI. Before that, led the Slingshot rebuild at Capital One and the Coiled rewrite that took reliability from 70% to 99.9%.

## Skills

- **Code and AI tools:** Python, Rust, TypeScript, SQL, React, Claude Code, MCP
- **Kubernetes and AWS:** EKS, EC2, Aurora, IAM, Karpenter, KEDA, kopf operators, Pulumi, Terraform
- **Data and distributed systems:** S3, Postgres, MongoDB, RabbitMQ, Dask, Databricks/Spark
- **Reliability:** Datadog, incident command, cloud cost

## Experience

### Earthmover - Staff Software Engineer

Sep 2025 -> Present

- Designed and built the Kubernetes controller that runs all customer compute. Added scale-to-zero, with a Rust TLS/SNI proxy that extends it to TCP workloads such as SQL and gRPC. Launched an EU region for data residency.
- Proposed a cross-region, cross-cloud job platform, wrote its design doc and built it: RabbitMQ with Python and Rust workers, KEDA queue-depth autoscaling (most pools scale to zero) and Karpenter. Retired the legacy job system.
- Led the move from ECS/Fargate to EKS, then moved compute to Graviton and spot instances, absorbing product growth at flat compute cost. Migrated the entire database from MongoDB to Postgres at about half the cost.
- Led a cost program checked against the AWS bill: run rate fell about 45% in two months.
- Rebuilt full-stack observability on Datadog and made AI-assisted debugging (Claude with the Datadog MCP) a team norm, so engineers across the org can now handle production outages.
- Redesigned core web app flows: merged the org dashboard and repo list into one home page, rebuilt the signed-in landing page and bucket creation, and added global search.
- Open source: fixed an [Icechunk](https://github.com/earth-mover/icechunk) GC deadlock. Built [triangular](https://github.com/earth-mover/triangular), a spec-first convex hull and Delaunay triangulation library written entirely through agentic coding. It runs in production and is up to 300x faster than Triangle on some inputs.

### Capital One - Senior Lead Software Engineer

Mar 2025 -> Sep 2025

- After Capital One acquired Sync, led the rebuild of its Databricks cost platform as Slingshot and shipped it for the Databricks AI Summit.
- Owned delivery across infrastructure, backend and frontend to bank compliance standards. Fortune 500 companies now use it to cut Spark cost.

### Sync Computing - Staff Software Engineer

Jun 2024 -> Mar 2025

- Rebuilt data ingest and infrastructure for enterprise workloads, unblocking a large customer onboarding and readying the product for acquisition.

### Coiled - Software Engineer -> Software Engineering Team Lead -> Staff Software Engineer

Mar 2021 -> May 2024

- Staff: conceived and built [package sync](https://docs.coiled.io/user_guide/software/sync.html), which copies local Python environments to the cloud [3x faster](https://medium.com/coiled-hq/just-in-time-python-environments-ade108ec67b6) than Docker images. Removed the top cause of Dask cloud errors; increased conversion. Built support analytics so support became proactive; churn fell drastically.
- Team Lead: planned a year-long roadmap and led a core rewrite, taking reliability from 70% to 99.9% and boots up to 5x faster. CI/CD and team training took deploys from monthly to several a day.
- Engineer: cut CI from over an hour to under 5 minutes at a fifth of the cost; moved all AWS infrastructure to Terraform.

### Nom Nom Data - Lead Software Engineer

May 2019 -> Mar 2021

- Full-stack development of a SaaS data-engineering product (Python, Flask, React, AWS Lambda, ECS).

### Nom Nom Data - Data Engineer

Feb 2018 -> May 2019

- Rewrote the subscription platform on AWS Lambda; cut server cost 50%.

### Anaconda Inc - Junior Internal Data Scientist

Apr 2017 -> Feb 2018

- Built executive dashboards over billions of package-download rows.

### WebBrick Systems - Software Engineer

Jul 2009 -> Jan 2011

- Integrated high-end media systems with home automation equipment.

## Education

University of Reading, UK - AI & Cybernetics, 2006 -> 2012
