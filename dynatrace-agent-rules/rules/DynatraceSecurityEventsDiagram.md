# Dynatrace Security Events Relationship Diagram

## Event Flow and Relationships

```mermaid
graph TB
    %% Compliance Events Flow
    subgraph "Compliance Scanning"
        CSC[COMPLIANCE_SCAN_COMPLETED<br/>scan.id: unique-scan-123]
        CF1[COMPLIANCE_FINDING<br/>scan.id: unique-scan-123<br/>object.id: HOST-ABC123]
        CF2[COMPLIANCE_FINDING<br/>scan.id: unique-scan-123<br/>object.id: K8S-POD-XYZ]
        CF3[COMPLIANCE_FINDING<br/>scan.id: unique-scan-123<br/>object.id: AWS-S3-BUCKET]

        CSC -->|generates| CF1
        CSC -->|generates| CF2
        CSC -->|generates| CF3
    end

    %% Vulnerability Events Flow
    subgraph "Vulnerability Management"
        VF[VULNERABILITY_FINDING<br/>vulnerability.id: CVE-2023-1234]
        VSR_V[VULNERABILITY_STATE_REPORT_EVENT<br/>event.level: VULNERABILITY<br/>vulnerability.id: CVE-2023-1234]
        VSR_E[VULNERABILITY_STATE_REPORT_EVENT<br/>event.level: ENTITY<br/>affected_entity.id: HOST-ABC123]
        VCE[VULNERABILITY_STATUS_CHANGE_EVENT<br/>vulnerability.id: CVE-2023-1234]
        VACE[VULNERABILITY_ASSESSMENT_CHANGE_EVENT<br/>vulnerability.id: CVE-2023-1234]

        VF -->|creates state| VSR_V
        VF -->|affects entity| VSR_E
        VSR_V -->|status changes| VCE
        VSR_V -->|assessment changes| VACE
    end

    %% Entity Relationships
    subgraph "Dynatrace Entity Model"
        HOST[HOST<br/>HOST-ABC123]
        PG[PROCESS_GROUP<br/>PG-DEF456]
        K8S_CLUSTER[KUBERNETES_CLUSTER<br/>K8S-CLUSTER-789]
        K8S_NODE[KUBERNETES_NODE<br/>K8S-NODE-101112]
        K8S_POD[KUBERNETES_POD<br/>K8S-POD-XYZ]
        APP[APPLICATION<br/>APP-GHI789]
        SERVICE[SERVICE<br/>SVC-JKL012]
        DATABASE[DATABASE<br/>DB-MNO345]
    end

    %% Cloud Provider Context
    subgraph "Cloud Infrastructure"
        AWS[AWS Account<br/>aws.account.id: 123456789012]
        AZURE[Azure Tenant<br/>azure.tenant.id: tenant-uuid]
        GCP[GCP Organization<br/>gcp.organization.id: org-123]

        AWS_S3[S3 Bucket<br/>object.type: awsbucket]
        AWS_EC2[EC2 Instance<br/>object.type: awsinstance]
        AZURE_AKS[AKS Cluster<br/>object.type: akscluster]
    end

    %% Key Relationships
    CF1 -.->|object.id| HOST
    CF2 -.->|object.id| K8S_POD
    CF3 -.->|object.id| AWS_S3

    VSR_E -.->|affected_entity.id| HOST
    VSR_E -.->|affected_entity.id| PG

    HOST -->|runs| PG
    PG -->|serves| SERVICE
    SERVICE -->|part of| APP
    APP -.->|connects to| DATABASE

    K8S_POD -->|runs on| K8S_NODE
    K8S_NODE -->|part of| K8S_CLUSTER

    AWS_S3 -->|belongs to| AWS
    AWS_EC2 -->|belongs to| AWS
    AZURE_AKS -->|belongs to| AZURE

    %% Styling
    classDef complianceEvent fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef vulnerabilityEvent fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef entity fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef cloud fill:#fff3e0,stroke:#f57c00,stroke-width:2px

    class CSC,CF1,CF2,CF3 complianceEvent
    class VF,VSR_V,VSR_E,VCE,VACE vulnerabilityEvent
    class HOST,PG,K8S_CLUSTER,K8S_NODE,K8S_POD,APP,SERVICE,DATABASE entity
    class AWS,AZURE,GCP,AWS_S3,AWS_EC2,AZURE_AKS cloud
```

## Key Relationship Fields

```mermaid
graph LR
    subgraph "Primary Keys"
        A[scan.id] --> B[Links COMPLIANCE_SCAN_COMPLETED<br/>to COMPLIANCE_FINDING events]
        C[vulnerability.id] --> D[Links all vulnerability events<br/>across different types]
        E[object.id] --> F[Links compliance findings<br/>to specific infrastructure objects]
        G[affected_entity.id] --> H[Links vulnerabilities<br/>to Dynatrace entities]
    end

    subgraph "Entity References"
        I[dt.entity.*] --> J[Direct references to<br/>Dynatrace entity model]
        K[dt.source_entity] --> L[Source entity for<br/>the security signal]
    end

    subgraph "Organizational Context"
        M[management_zones.ids] --> N[Organizational grouping<br/>of affected entities]
        O[cloud.provider] --> P[Cloud platform context<br/>aws, azure, gcp]
    end

    classDef keyField fill:#ffecb3,stroke:#ff8f00,stroke-width:2px
    class A,C,E,G,I,K,M,O keyField
```

## Event Lifecycle Patterns

```mermaid
sequenceDiagram
    participant Scanner as Compliance Scanner
    participant Grail as Dynatrace Grail
    participant Entity as Entity Model
    participant User as Security Team

    %% Compliance Scan Flow
    Note over Scanner,Grail: Compliance Scanning Lifecycle
    Scanner->>Grail: COMPLIANCE_SCAN_COMPLETED<br/>(scan.id: scan-123)
    Scanner->>Grail: COMPLIANCE_FINDING<br/>(scan.id: scan-123, object.id: HOST-1)
    Scanner->>Grail: COMPLIANCE_FINDING<br/>(scan.id: scan-123, object.id: K8S-POD-1)
    Scanner->>Grail: COMPLIANCE_FINDING<br/>(scan.id: scan-123, object.id: S3-BUCKET-1)

    %% Vulnerability Detection Flow
    Note over Scanner,User: Vulnerability Management Lifecycle
    Scanner->>Grail: VULNERABILITY_FINDING<br/>(vulnerability.id: CVE-2023-1234)
    Grail->>Entity: Link to affected entities
    Grail->>Grail: VULNERABILITY_STATE_REPORT_EVENT<br/>(current state)

    %% Change Events
    Note over Grail,User: Change Detection
    Entity->>Grail: Entity status change detected
    Grail->>Grail: VULNERABILITY_STATUS_CHANGE_EVENT
    Grail->>User: Alert/Notification

    User->>Grail: Mute vulnerability
    Grail->>Grail: VULNERABILITY_ASSESSMENT_CHANGE_EVENT
```

## Data Flow Architecture

```mermaid
graph TD
    subgraph "Data Sources"
        AWS_API[AWS Config API]
        K8S_API[Kubernetes API]
        AZURE_API[Azure Resource Manager]
        SNYK[Snyk Scanner]
        TENABLE[Tenable Scanner]
    end

    subgraph "Dynatrace Platform"
        SCANNER[Compliance Scanner]
        VULN_ENGINE[Vulnerability Engine]
        GRAIL[(Grail Data Lake)]
        ENTITY_MODEL[Entity Model]
    end

    subgraph "Security Events"
        COMP_EVENTS[Compliance Events<br/>• COMPLIANCE_SCAN_COMPLETED<br/>• COMPLIANCE_FINDING]
        VULN_EVENTS[Vulnerability Events<br/>• VULNERABILITY_FINDING<br/>• VULNERABILITY_STATE_REPORT_EVENT<br/>• VULNERABILITY_*_CHANGE_EVENT]
    end

    subgraph "Analysis & Response"
        DQL[DQL Queries]
        DASHBOARDS[Security Dashboards]
        ALERTS[Security Alerts]
        WORKFLOWS[Remediation Workflows]
    end

    %% Data Flow
    AWS_API --> SCANNER
    K8S_API --> SCANNER
    AZURE_API --> SCANNER
    SNYK --> VULN_ENGINE
    TENABLE --> VULN_ENGINE

    SCANNER --> COMP_EVENTS
    VULN_ENGINE --> VULN_EVENTS

    COMP_EVENTS --> GRAIL
    VULN_EVENTS --> GRAIL
    ENTITY_MODEL --> GRAIL

    GRAIL --> DQL
    DQL --> DASHBOARDS
    DQL --> ALERTS
    ALERTS --> WORKFLOWS

    %% Styling
    classDef source fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef platform fill:#f1f8e9,stroke:#689f38,stroke-width:2px
    classDef events fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef analysis fill:#fff8e1,stroke:#ffa000,stroke-width:2px

    class AWS_API,K8S_API,AZURE_API,SNYK,TENABLE source
    class SCANNER,VULN_ENGINE,GRAIL,ENTITY_MODEL platform
    class COMP_EVENTS,VULN_EVENTS events
    class DQL,DASHBOARDS,ALERTS,WORKFLOWS analysis
```

## Usage Instructions

### Viewing the Diagrams

1. **GitHub/GitLab**: Diagrams render automatically in markdown files
2. **VS Code**: Install "Markdown Preview Mermaid Support" extension
3. **Online**: Copy to [Mermaid Live Editor](https://mermaid.live/)
4. **Documentation Sites**: Most support Mermaid rendering (GitBook, Notion, etc.)

### Key Insights from Diagrams

1. **scan.id** is the primary relationship key for compliance events
2. **vulnerability.id** links all vulnerability-related events
3. **object.id** and **affected_entity.id** connect events to infrastructure
4. Events flow from detection → state reporting → change tracking
5. Entity model provides the foundation for all security event relationships
