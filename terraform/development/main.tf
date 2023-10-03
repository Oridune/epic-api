resource "aws_lightsail_container_service" "epic-api-development" {
  name  = "epic-api-development"
  power = "micro"
  scale = 1
}

resource "aws_lightsail_container_service_deployment_version" "epic-api-development_deployment" {
  container {
    container_name = "epic-api-development"
    image          = var.container_image

    environment = local.dot_env

    ports = {
      # Consistent with the port exposed by the Dockerfile
      3742 = "HTTP"
    }
  }

  public_endpoint {
    container_name = "epic-api-development"
    # Consistent with the port exposed by the Dockerfile
    container_port = 3742

    health_check {
      healthy_threshold   = 2
      unhealthy_threshold = 2
      timeout_seconds     = 2
      interval_seconds    = 5
      path                = "/"
      success_codes       = "200-499"
    }
  }

  service_name = aws_lightsail_container_service.epic-api-development.name
}
