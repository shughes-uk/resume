resource "aws_ecs_cluster" "main" {
  name = "production"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "fargate" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

data "aws_iam_policy_document" "ecs_task_execution_role" {
  statement {
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_db_instance.main.master_user_secret.0.secret_arn,
      aws_secretsmanager_secret.django_secret_key.arn
    ]
  }
}
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ecs_task_execution_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com",
        },
        Action = "sts:AssumeRole",
      },
    ],
  })

  inline_policy {
    name   = "ecs_task_execution_role_get_secret"
    policy = data.aws_iam_policy_document.ecs_task_execution_role.json
  }

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
  ]
}

resource "aws_secretsmanager_secret" "django_secret_key" {
  name = "production-django-secret-key"
}

resource "aws_secretsmanager_secret_version" "django_secret_key" {
  secret_id     = aws_secretsmanager_secret.django_secret_key.id
  secret_string = data.aws_secretsmanager_random_password.django_secret_key.random_password

  lifecycle {
    ignore_changes = [secret_string]
  }
}

data "aws_secretsmanager_random_password" "django_secret_key" {
  password_length     = 50
  include_space       = false
  exclude_punctuation = true
}


locals {
  container_definitions = jsonencode([
    {
      name      = "backend-api"
      image     = "${var.app_image}"
      cpu       = 256
      memory    = 512
      essential = true
      logConfiguration = {
        "logDriver" : "awslogs",
        "options" : {
          "awslogs-group" : aws_cloudwatch_log_group.main.name,
          "awslogs-region" : "us-east-1",
          "awslogs-stream-prefix" : "ecs"
        }
      }
      portMappings = [
        {
          containerPort = 80,
          hostPort      = 80,
          protocol      = "tcp",
        },
      ],
      environment = [
        {
          name  = "ALLOWED_HOSTS"
          value = "${local.api_domain_name},${local.domain_name}"
        },
        {
          name  = "CORS_ALLOWED_ORIGINS"
          value = "https://${local.api_domain_name},https://${local.domain_name}"
        },
        {
          name  = "CSRF_COOKIE_DOMAIN"
          value = ".${local.domain_name}"
        },
        {
          name  = "DB_HOST"
          value = aws_db_instance.main.address
        },
        {
          name  = "DB_PORT"
          value = tostring(aws_db_instance.main.port)
        },
        {
          name  = "DB_NAME"
          value = aws_db_instance.main.db_name
        },
        {
          name  = "DB_USER"
          value = aws_db_instance.main.username
        },
      ],
      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = "${aws_db_instance.main.master_user_secret.0.secret_arn}:password::"
        },
        {
          name      = "SECRET_KEY"
          valueFrom = aws_secretsmanager_secret.django_secret_key.arn
        },
      ]
    },
  ])
}

resource "aws_ecs_task_definition" "main" {
  family                   = "production"
  container_definitions    = local.container_definitions
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
}

resource "aws_ecs_service" "main" {
  name                  = "production"
  cluster               = aws_ecs_cluster.main.id
  task_definition       = aws_ecs_task_definition.main.arn
  desired_count         = 1
  launch_type           = "FARGATE"
  wait_for_steady_state = true

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 0

  network_configuration {
    subnets          = module.vpc.public_subnets
    security_groups  = [aws_security_group.ecs_service.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "backend-api"
    container_port   = 80
  }
}
