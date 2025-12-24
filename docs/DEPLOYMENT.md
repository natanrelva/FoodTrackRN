# 🚢 Guia de Deploy - FoodTrack

**Versão:** 1.1  
**Última Atualização:** 23 de Dezembro de 2024

## Ambientes

### Development (Local)
- **Docker Compose** para serviços
- **Hot reload** para desenvolvimento
- **Dados de teste** inclusos

### Staging
- **Kubernetes** cluster
- **CI/CD** automático
- **Dados similares** à produção

### Production
- **Kubernetes** cluster
- **Deploy manual** ou aprovado
- **Dados reais** e **backups**

## Docker

### Development

```bash
# Iniciar serviços de desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Parar serviços
docker-compose -f docker-compose.dev.yml down

# Reset completo (cuidado: apaga dados)
docker-compose -f docker-compose.dev.yml down -v
```

### Production Build

```dockerfile
# Dockerfile.api-gateway
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build:types
RUN pnpm build:shared
RUN pnpm --filter @foodtrack/api-gateway build

# Production stage
FROM node:18-alpine AS runtime

WORKDIR /app

# Install production dependencies
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/backend/api-gateway/dist ./dist
COPY --from=builder /app/packages/types/dist ./node_modules/@foodtrack/types/dist
COPY --from=builder /app/backend/shared/dist ./node_modules/@foodtrack/backend-shared/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S foodtrack -u 1001
USER foodtrack

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
```

### Multi-stage Build Script

```bash
#!/bin/bash
# scripts/build-docker.sh

set -e

echo "🏗️ Building Docker images..."

# Build API Gateway
docker build -f docker/Dockerfile.api-gateway -t foodtrack/api-gateway:latest .

# Build Frontend Client
docker build -f docker/Dockerfile.client -t foodtrack/client:latest ./frontend/client

# Build Frontend Tenant
docker build -f docker/Dockerfile.tenant -t foodtrack/tenant:latest ./frontend/tenant

echo "✅ Docker images built successfully!"
```

## Kubernetes

### Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: foodtrack
  labels:
    name: foodtrack
```

### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: foodtrack-config
  namespace: foodtrack
data:
  NODE_ENV: "production"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "foodtrack"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  ALLOWED_ORIGINS: "https://app.foodtrack.com,https://admin.foodtrack.com"
```

### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: foodtrack-secrets
  namespace: foodtrack
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  DB_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
```

### Database Deployment

```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: foodtrack
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: foodtrack-config
              key: DB_NAME
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: foodtrack-secrets
              key: DB_PASSWORD
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: foodtrack
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: foodtrack
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

### API Gateway Deployment

```yaml
# k8s/api-gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: foodtrack
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: foodtrack/api-gateway:latest
        ports:
        - containerPort: 4000
        env:
        - name: PORT
          value: "4000"
        envFrom:
        - configMapRef:
            name: foodtrack-config
        - secretRef:
            name: foodtrack-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: foodtrack
spec:
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 4000
  type: ClusterIP
```

### Frontend Deployments

```yaml
# k8s/frontend-client.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-client
  namespace: foodtrack
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend-client
  template:
    metadata:
      labels:
        app: frontend-client
    spec:
      containers:
      - name: frontend-client
        image: foodtrack/client:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-client-service
  namespace: foodtrack
spec:
  selector:
    app: frontend-client
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: foodtrack-ingress
  namespace: foodtrack
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - app.foodtrack.com
    - admin.foodtrack.com
    - api.foodtrack.com
    secretName: foodtrack-tls
  rules:
  - host: app.foodtrack.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-client-service
            port:
              number: 80
  - host: admin.foodtrack.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-tenant-service
            port:
              number: 80
  - host: api.foodtrack.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway-service
            port:
              number: 80
```

### HPA (Horizontal Pod Autoscaler)

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: foodtrack
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: foodtrack_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'pnpm'

    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Build packages
      run: |
        pnpm build:types
        pnpm build:shared

    - name: Run linting
      run: pnpm lint

    - name: Run type checking
      run: pnpm type-check

    - name: Run tests
      run: pnpm test
      env:
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: foodtrack_test
        DB_USER: postgres
        DB_PASSWORD: postgres
        REDIS_HOST: localhost
        REDIS_PORT: 6379

    - name: Build applications
      run: pnpm build

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    permissions:
      contents: read
      packages: write

    strategy:
      matrix:
        service: [api-gateway, client, tenant]

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-${{ matrix.service }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./docker/Dockerfile.${{ matrix.service }}
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    environment: production

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Deploy to Kubernetes
      run: |
        export KUBECONFIG=kubeconfig
        
        # Update image tags
        sed -i "s|foodtrack/api-gateway:latest|${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-api-gateway:${{ github.sha }}|g" k8s/api-gateway.yaml
        sed -i "s|foodtrack/client:latest|${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-client:${{ github.sha }}|g" k8s/frontend-client.yaml
        sed -i "s|foodtrack/tenant:latest|${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-tenant:${{ github.sha }}|g" k8s/frontend-tenant.yaml
        
        # Apply configurations
        kubectl apply -f k8s/namespace.yaml
        kubectl apply -f k8s/configmap.yaml
        kubectl apply -f k8s/secrets.yaml
        kubectl apply -f k8s/postgres.yaml
        kubectl apply -f k8s/redis.yaml
        kubectl apply -f k8s/api-gateway.yaml
        kubectl apply -f k8s/frontend-client.yaml
        kubectl apply -f k8s/frontend-tenant.yaml
        kubectl apply -f k8s/ingress.yaml
        kubectl apply -f k8s/hpa.yaml
        
        # Wait for rollout
        kubectl rollout status deployment/api-gateway -n foodtrack
        kubectl rollout status deployment/frontend-client -n foodtrack
        kubectl rollout status deployment/frontend-tenant -n foodtrack

    - name: Run database migrations
      run: |
        export KUBECONFIG=kubeconfig
        
        # Create migration job
        kubectl create job --from=cronjob/migration-job migration-$(date +%s) -n foodtrack || true
        
        # Wait for migration to complete
        kubectl wait --for=condition=complete job/migration-$(date +%s) -n foodtrack --timeout=300s

  notify:
    needs: [test, build-and-push, deploy]
    runs-on: ubuntu-latest
    if: always()

    steps:
    - name: Notify Slack
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      if: always()
```

### Helm Charts (Alternativa)

```yaml
# helm/foodtrack/Chart.yaml
apiVersion: v2
name: foodtrack
description: FoodTrack Helm Chart
type: application
version: 0.1.0
appVersion: "1.0.0"

dependencies:
- name: postgresql
  version: 12.x.x
  repository: https://charts.bitnami.com/bitnami
- name: redis
  version: 17.x.x
  repository: https://charts.bitnami.com/bitnami
```

```yaml
# helm/foodtrack/values.yaml
replicaCount: 3

image:
  repository: foodtrack/api-gateway
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.foodtrack.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: foodtrack-tls
      hosts:
        - api.foodtrack.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

postgresql:
  enabled: true
  auth:
    postgresPassword: "secure-password"
    database: "foodtrack"

redis:
  enabled: true
  auth:
    enabled: false
```

## Monitoramento

### Prometheus & Grafana

```yaml
# k8s/monitoring.yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: foodtrack-api-gateway
  namespace: foodtrack
spec:
  selector:
    matchLabels:
      app: api-gateway
  endpoints:
  - port: http
    path: /metrics
```

### Logging com ELK Stack

```yaml
# k8s/logging.yaml
apiVersion: logging.coreos.com/v1
kind: ClusterLogForwarder
metadata:
  name: foodtrack-logs
  namespace: openshift-logging
spec:
  outputs:
  - name: elasticsearch
    type: elasticsearch
    url: https://elasticsearch.logging.svc.cluster.local:9200
  pipelines:
  - name: foodtrack-logs
    inputRefs:
    - application
    filterRefs:
    - foodtrack-filter
    outputRefs:
    - elasticsearch
```

## Backup e Restore

### Database Backup

```bash
#!/bin/bash
# scripts/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="foodtrack_backup_${DATE}.sql"

# Create backup
kubectl exec -n foodtrack deployment/postgres -- pg_dump -U postgres foodtrack > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://foodtrack-backups/database/

# Keep only last 30 days
aws s3 ls s3://foodtrack-backups/database/ | head -n -30 | awk '{print $4}' | xargs -I {} aws s3 rm s3://foodtrack-backups/database/{}

echo "Backup completed: $BACKUP_FILE"
```

### Restore Database

```bash
#!/bin/bash
# scripts/restore-db.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

# Download from S3
aws s3 cp s3://foodtrack-backups/database/$BACKUP_FILE ./

# Restore database
kubectl exec -i -n foodtrack deployment/postgres -- psql -U postgres -d foodtrack < $BACKUP_FILE

echo "Restore completed from: $BACKUP_FILE"
```

## Rollback

### Kubernetes Rollback

```bash
# Ver histórico de deployments
kubectl rollout history deployment/api-gateway -n foodtrack

# Rollback para versão anterior
kubectl rollout undo deployment/api-gateway -n foodtrack

# Rollback para versão específica
kubectl rollout undo deployment/api-gateway --to-revision=2 -n foodtrack

# Verificar status do rollback
kubectl rollout status deployment/api-gateway -n foodtrack
```

### Blue-Green Deployment

```yaml
# k8s/blue-green.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-gateway-rollout
  namespace: foodtrack
spec:
  replicas: 5
  strategy:
    blueGreen:
      activeService: api-gateway-active
      previewService: api-gateway-preview
      autoPromotionEnabled: false
      scaleDownDelaySeconds: 30
      prePromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: api-gateway-preview
      postPromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: api-gateway-active
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: foodtrack/api-gateway:latest
```

## Troubleshooting

### Logs de Deploy

```bash
# Ver logs do deployment
kubectl logs -f deployment/api-gateway -n foodtrack

# Ver eventos do namespace
kubectl get events -n foodtrack --sort-by='.lastTimestamp'

# Descrever pod com problemas
kubectl describe pod <pod-name> -n foodtrack

# Executar shell no pod
kubectl exec -it <pod-name> -n foodtrack -- /bin/sh
```

### Health Checks

```bash
# Verificar health da API
kubectl exec -n foodtrack deployment/api-gateway -- curl -f http://localhost:4000/health

# Verificar conectividade do banco
kubectl exec -n foodtrack deployment/postgres -- pg_isready -U postgres

# Verificar Redis
kubectl exec -n foodtrack deployment/redis -- redis-cli ping
```

### Performance Issues

```bash
# Ver uso de recursos
kubectl top pods -n foodtrack
kubectl top nodes

# Ver métricas detalhadas
kubectl describe hpa api-gateway-hpa -n foodtrack

# Escalar manualmente se necessário
kubectl scale deployment api-gateway --replicas=5 -n foodtrack
```