import { Duration, Stack, StackProps, CfnMapping, Aws, CfnOutput, CfnJson } from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';

export class CdkEksDevLoghubWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create the VPC
    const vpc = new ec2.Vpc(this, 'EKSVpc', {
      maxAzs: 3
    });

    // Create the EKS Cluster
    const clusterAdmin = new iam.Role(this, 'EKS-workshop-AdminRole', {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const cluster = new eks.Cluster(this, 'EKSCluster', {
      vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      mastersRole: clusterAdmin,
      defaultCapacity: 2,
      version: eks.KubernetesVersion.V1_24, // If using containerD, you need set to V1_24
      albController: {
        version: eks.AlbControllerVersion.V2_4_1,
      },
      clusterName: 'CL-Workshop-Cluster',
      endpointAccess: eks.EndpointAccess.PUBLIC,
    });

    const appLabel = { app: "hello-kubernetes" };

    const deployment = {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: { name: "hello-kubernetes" },
      spec: {
        replicas: 3,
        selector: { matchLabels: appLabel },
        template: {
          metadata: { labels: appLabel },
          spec: {
            containers: [
              {
                name: "hello-kubernetes",
                image: "paulbouwer/hello-kubernetes:1.5",
                ports: [{ containerPort: 8080 }],
              },
            ],
          },
        },
      },
    };

    const service = {
      apiVersion: "v1",
      kind: "Service",
      metadata: { name: "hello-kubernetes" },
      spec: {
        type: "LoadBalancer",
        ports: [{ port: 80, targetPort: 8080 }],
        selector: appLabel,
      }
    };

    // const manifest = cluster.addManifest('hello-kub', service, deployment);

    const ingress = {
      "apiVersion": "networking.k8s.io/v1",
      "kind": "Ingress",
      "metadata": {
        "name": "hello-kubernetes",
        "annotations": {
          "kubernetes.io/ingress.class": "alb",
          "external-dns.alpha.kubernetes.io/ttl": "30",
          "nginx.ingress.kubernetes.io/client-body-buffer-size": "10m"
        }
      },
      "spec": {
        "rules": [
          {
            "http": {
              "paths": [
                {
                  "backend": {
                    "service": {
                      "name": "hello-kubernetes",
                      "port": {
                        "number": 80
                      }
                    }
                  },
                  "pathType": "Prefix",
                  "path": "/"
                }
              ]
            }
          }
        ]
      }
    };

    const manifest = cluster.addManifest('hello-kub', service, ingress, deployment);
    manifest.node.addDependency(cluster.albController!);
  }

}


