# Cloud Native Marketplace

A cloud-native e-commerce application built with a microservices architecture using Node.js, Docker, Kubernetes, PostgreSQL, Redis, and AWS.

## Project Goals

This project is being built to demonstrate production-ready backend engineering and DevOps practices, including:

- Microservices architecture
- API Gateway
- Docker containerization
- Kubernetes deployment
- PostgreSQL
- Redis
- AWS S3
- CI/CD with GitHub Actions
- Monitoring with Prometheus and Grafana

---

## Architecture

Current architecture:

```
Internet
    │
AWS Application Load Balancer
    │
NGINX Ingress Controller
    │
API Gateway
    │
├── Identity Service
├── Product Service
├── Order Service
└── Upload Service

PostgreSQL
Redis
AWS S3
```

---

## Project Structure

```
marketplace/
├── api-gateway/
├── identity-service/
├── product-service/
├── order-service/
├── upload-service/
├── frontend/
├── infrastructure/
└── docs/
```

---

## Tech Stack

### Backend

- Node.js
- Express

### Infrastructure

- Docker
- Kubernetes

### Database

- PostgreSQL

### Cache

- Redis

### Cloud

- AWS

---

## Current Progress

- [x] Architecture Design
- [x] Repository Setup
- [x] API Gateway
- [x] Identity Service
- [ ] Docker
- [ ] Kubernetes
- [x] Authentication
- [x] Products
- [ ] Orders
- [ ] Upload Service
- [ ] Monitoring
- [ ] CI/CD

---

## Author

NNAYEM CHRISTOPHER OLISADEBE
