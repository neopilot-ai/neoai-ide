# NeoAI IDE - Global Multi-Region Deployment Infrastructure
# Terraform configuration for worldwide deployment with CDN, auto-scaling, and edge computing

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "neoai-terraform-state"
    key            = "global-deployment/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "neoai-terraform-locks"
  }
}

# Variables
variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "regions" {
  description = "AWS regions for multi-region deployment"
  type        = list(string)
  default = [
    "us-east-1",      # N. Virginia (Primary)
    "us-west-2",      # Oregon
    "eu-west-1",      # Ireland
    "eu-central-1",   # Frankfurt
    "ap-southeast-1", # Singapore
    "ap-northeast-1", # Tokyo
    "ap-south-1",     # Mumbai
    "sa-east-1"       # São Paulo
  ]
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "neoai-ide.com"
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
  sensitive   = true
}

# Local values
locals {
  common_tags = {
    Project     = "NeoAI-IDE"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Version     = "5.0.0"
  }

  primary_region = var.regions[0]
  
  # Edge locations for AI inference
  edge_locations = [
    "us-east-1",
    "us-west-2", 
    "eu-west-1",
    "ap-southeast-1"
  ]
}

# Data sources
data "aws_availability_zones" "available" {
  for_each = toset(var.regions)
  provider = aws.region[each.key]
  state    = "available"
}

data "aws_caller_identity" "current" {}

# Provider configurations for multi-region
provider "aws" {
  alias  = "primary"
  region = local.primary_region
  
  default_tags {
    tags = local.common_tags
  }
}

# Dynamic provider configuration for each region
provider "aws" {
  for_each = toset(var.regions)
  alias    = "region_${replace(each.key, "-", "_")}"
  region   = each.key
  
  default_tags {
    tags = merge(local.common_tags, {
      Region = each.key
    })
  }
}

# Cloudflare provider
provider "cloudflare" {
  # API token should be set via CLOUDFLARE_API_TOKEN environment variable
}

# Global VPC and Networking
module "global_networking" {
  source = "./modules/networking"
  
  for_each = toset(var.regions)
  
  providers = {
    aws = aws.region[each.key]
  }
  
  region      = each.key
  environment = var.environment
  
  vpc_cidr = cidrsubnet("10.0.0.0/8", 8, index(var.regions, each.key))
  
  availability_zones = data.aws_availability_zones.available[each.key].names
  
  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = local.common_tags
}

# Global EKS Clusters
module "eks_clusters" {
  source = "./modules/eks"
  
  for_each = toset(var.regions)
  
  providers = {
    aws        = aws.region[each.key]
    kubernetes = kubernetes.region[each.key]
    helm       = helm.region[each.key]
  }
  
  cluster_name    = "neoai-ide-${each.key}"
  cluster_version = "1.28"
  
  vpc_id          = module.global_networking[each.key].vpc_id
  subnet_ids      = module.global_networking[each.key].private_subnet_ids
  
  # Node groups configuration
  node_groups = {
    general = {
      desired_capacity = 3
      max_capacity     = 10
      min_capacity     = 1
      
      instance_types = ["t3.large", "t3.xlarge"]
      capacity_type  = "ON_DEMAND"
      
      k8s_labels = {
        role = "general"
      }
    }
    
    ai_inference = {
      desired_capacity = 2
      max_capacity     = 20
      min_capacity     = 0
      
      instance_types = ["g4dn.xlarge", "g4dn.2xlarge"]
      capacity_type  = "SPOT"
      
      k8s_labels = {
        role = "ai-inference"
      }
      
      taints = [{
        key    = "nvidia.com/gpu"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
    
    model_training = {
      desired_capacity = 0
      max_capacity     = 5
      min_capacity     = 0
      
      instance_types = ["p3.2xlarge", "p3.8xlarge"]
      capacity_type  = "SPOT"
      
      k8s_labels = {
        role = "model-training"
      }
      
      taints = [{
        key    = "nvidia.com/gpu"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }
  
  # Add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }
  
  tags = local.common_tags
}

# Global RDS Aurora Clusters
module "aurora_clusters" {
  source = "./modules/aurora"
  
  for_each = toset(var.regions)
  
  providers = {
    aws = aws.region[each.key]
  }
  
  cluster_identifier = "neoai-ide-${each.key}"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  
  vpc_id     = module.global_networking[each.key].vpc_id
  subnet_ids = module.global_networking[each.key].database_subnet_ids
  
  # Global cluster configuration
  global_cluster_identifier = each.key == local.primary_region ? "neoai-ide-global" : null
  source_region            = each.key != local.primary_region ? local.primary_region : null
  
  instance_class = "db.r6g.large"
  instances = {
    writer = {}
    reader = {}
  }
  
  # Backup and maintenance
  backup_retention_period = 30
  preferred_backup_window = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"
  
  # Security
  storage_encrypted = true
  kms_key_id       = module.kms[each.key].key_id
  
  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]
  monitoring_interval             = 60
  
  tags = local.common_tags
}

# Global Redis Clusters
module "redis_clusters" {
  source = "./modules/redis"
  
  for_each = toset(var.regions)
  
  providers = {
    aws = aws.region[each.key]
  }
  
  cluster_id = "neoai-ide-${each.key}"
  
  vpc_id     = module.global_networking[each.key].vpc_id
  subnet_ids = module.global_networking[each.key].private_subnet_ids
  
  # Global datastore for cross-region replication
  global_replication_group_id = each.key == local.primary_region ? "neoai-ide-global" : null
  
  node_type               = "cache.r6g.large"
  num_cache_clusters      = 3
  parameter_group_name    = "default.redis7"
  port                    = 6379
  
  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth[each.key].result
  
  # Backup
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  
  tags = local.common_tags
}

# KMS Keys for encryption
module "kms" {
  source = "./modules/kms"
  
  for_each = toset(var.regions)
  
  providers = {
    aws = aws.region[each.key]
  }
  
  description = "NeoAI IDE encryption key for ${each.key}"
  
  tags = local.common_tags
}

# Random passwords
resource "random_password" "redis_auth" {
  for_each = toset(var.regions)
  
  length  = 32
  special = true
}

# CloudFront Distribution for Global CDN
resource "aws_cloudfront_distribution" "global_cdn" {
  provider = aws.primary
  
  origin {
    domain_name = aws_lb.global_alb.dns_name
    origin_id   = "neoai-ide-origin"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  # Additional origins for different services
  dynamic "origin" {
    for_each = var.regions
    content {
      domain_name = module.eks_clusters[origin.value].cluster_endpoint
      origin_id   = "api-${origin.value}"
      
      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }
  
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  aliases = [
    var.domain_name,
    "*.${var.domain_name}"
  ]
  
  # Default cache behavior
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "neoai-ide-origin"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "CloudFront-Forwarded-Proto"]
      
      cookies {
        forward = "all"
      }
    }
    
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }
  
  # API cache behavior
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "neoai-ide-origin"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = true
      headers      = ["*"]
      
      cookies {
        forward = "all"
      }
    }
    
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }
  
  # Static assets cache behavior
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "neoai-ide-origin"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = false
      
      cookies {
        forward = "none"
      }
    }
    
    min_ttl     = 86400
    default_ttl = 86400
    max_ttl     = 31536000
  }
  
  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  # SSL certificate
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.ssl_cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  # Custom error pages
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
  
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  
  # WAF
  web_acl_id = aws_wafv2_web_acl.cloudfront_waf.arn
  
  tags = local.common_tags
}

# Global Application Load Balancer
resource "aws_lb" "global_alb" {
  provider = aws.primary
  
  name               = "neoai-ide-global-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = module.global_networking[local.primary_region].public_subnet_ids
  
  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true
  
  tags = local.common_tags
}

# SSL Certificate
resource "aws_acm_certificate" "ssl_cert" {
  provider = aws.primary
  
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = local.common_tags
}

# Route53 Hosted Zone
resource "aws_route53_zone" "main" {
  provider = aws.primary
  
  name = var.domain_name
  
  tags = local.common_tags
}

# Route53 Health Checks for each region
resource "aws_route53_health_check" "region_health" {
  provider = aws.primary
  
  for_each = toset(var.regions)
  
  fqdn                            = "api-${each.key}.${var.domain_name}"
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/health"
  failure_threshold               = 3
  request_interval                = 30
  cloudwatch_logs_region          = each.key
  cloudwatch_alarm_region         = each.key
  insufficient_data_health_status = "Failure"
  
  tags = merge(local.common_tags, {
    Name = "neoai-ide-health-${each.key}"
  })
}

# Route53 Records with Geolocation Routing
resource "aws_route53_record" "api_geolocation" {
  provider = aws.primary
  
  for_each = {
    "us-east-1"      = { continent = "NA", country = "US" }
    "us-west-2"      = { continent = "NA", country = "US" }
    "eu-west-1"      = { continent = "EU" }
    "eu-central-1"   = { continent = "EU" }
    "ap-southeast-1" = { continent = "AS" }
    "ap-northeast-1" = { continent = "AS" }
    "ap-south-1"     = { continent = "AS" }
    "sa-east-1"      = { continent = "SA" }
  }
  
  zone_id = aws_route53_zone.main.zone_id
  name    = "api"
  type    = "A"
  
  set_identifier = each.key
  
  geolocation_routing_policy {
    continent = lookup(each.value, "continent", null)
    country   = lookup(each.value, "country", null)
  }
  
  health_check_id = aws_route53_health_check.region_health[each.key].id
  
  alias {
    name                   = module.eks_clusters[each.key].cluster_endpoint
    zone_id                = module.eks_clusters[each.key].cluster_hosted_zone_id
    evaluate_target_health = true
  }
}

# WAF for CloudFront
resource "aws_wafv2_web_acl" "cloudfront_waf" {
  provider = aws.primary
  
  name  = "neoai-ide-cloudfront-waf"
  scope = "CLOUDFRONT"
  
  default_action {
    allow {}
  }
  
  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }
  
  # AWS Managed Rules
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }
  
  tags = local.common_tags
}

# Outputs
output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID"
  value       = aws_cloudfront_distribution.global_cdn.id
}

output "cloudfront_domain_name" {
  description = "CloudFront Distribution Domain Name"
  value       = aws_cloudfront_distribution.global_cdn.domain_name
}

output "route53_zone_id" {
  description = "Route53 Hosted Zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "eks_cluster_endpoints" {
  description = "EKS Cluster Endpoints by Region"
  value = {
    for region in var.regions :
    region => module.eks_clusters[region].cluster_endpoint
  }
}

output "aurora_cluster_endpoints" {
  description = "Aurora Cluster Endpoints by Region"
  value = {
    for region in var.regions :
    region => module.aurora_clusters[region].cluster_endpoint
  }
}

output "redis_cluster_endpoints" {
  description = "Redis Cluster Endpoints by Region"
  value = {
    for region in var.regions :
    region => module.redis_clusters[region].configuration_endpoint
  }
}
