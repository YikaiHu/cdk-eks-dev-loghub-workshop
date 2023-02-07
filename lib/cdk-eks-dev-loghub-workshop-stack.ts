import { Duration, Stack, StackProps, CfnMapping, Aws, CfnOutput, CfnJson } from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from "path";
import * as fs from 'fs';

import { Construct } from 'constructs';

export class CdkEksDevLoghubWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create the VPC
    const vpc = new ec2.Vpc(this, 'EKSVpc', {
      maxAzs: 3
    });

    // Create the EKS Cluster
    const clusterAdminRole = new iam.Role(this, 'EKSWorkshopAdminRole', {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const clusterPolicy = new iam.Policy(this, "clusterPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: [
            '*'
          ],
          resources: ["*"],
        }),
      ],
    });
    clusterAdminRole.attachInlinePolicy(clusterPolicy);

    const cluster = new eks.Cluster(this, 'EKSCluster', {
      vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      mastersRole: clusterAdminRole,
      defaultCapacity: 1,
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
        type: "NodePort",
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
          "alb.ingress.kubernetes.io/scheme": "internet-facing"
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

    const yaml = require('js-yaml');

    const nginxIngress = yaml.safeLoadAll(fs.readFileSync(path.join(__dirname, "../manifest/nginx-ingress-controller-v1.5.1.yaml")));

    const manifest = cluster.addManifest('hello-kub', ...nginxIngress);
    // const manifest = cluster.addManifest('hello-kub', deployment, service, ingress);
    // manifest.node.addDependency(cluster.albController!);
  }

}


