resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-rds-subnet-group"
  subnet_ids = [for s in aws_subnet.private : s.id]

  tags = {
    Name = "${local.name_prefix}-rds-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "Permite acesso ao MySQL apenas a partir dos nodes do EKS e da Lambda"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL from EKS nodes"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_eks_cluster.main.vpc_config[0].cluster_security_group_id]
  }

  ingress {
    description     = "MySQL from lambda-auth"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda_auth.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-rds-sg"
  }
}

resource "random_password" "rds_master" {
  length  = 24
  special = false
}

resource "aws_secretsmanager_secret" "rds_credentials" {
  name                    = "${local.name_prefix}-rds-credentials"
  description             = "Credenciais root do RDS MySQL do hackathon"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "rds_credentials" {
  secret_id = aws_secretsmanager_secret.rds_credentials.id
  secret_string = jsonencode({
    username = "hackathon"
    password = random_password.rds_master.result
    host     = aws_db_instance.main.address
    port     = 3306
  })

  depends_on = [aws_db_instance.main]
}

resource "aws_db_instance" "main" {
  identifier              = "${local.name_prefix}-mysql"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = var.rds_instance_class
  allocated_storage       = var.rds_allocated_storage
  storage_type            = "gp2"
  storage_encrypted       = true
  username                = "hackathon"
  password                = random_password.rds_master.result
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  publicly_accessible     = false
  backup_retention_period = 1
  skip_final_snapshot     = true
  multi_az                = false
  deletion_protection     = false
  apply_immediately       = true

  tags = {
    Name = "${local.name_prefix}-mysql"
  }
}
