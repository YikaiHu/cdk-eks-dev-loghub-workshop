#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkEksDevLoghubWorkshopStack } from '../lib/cdk-eks-dev-loghub-workshop-stack';

const app = new cdk.App();
new CdkEksDevLoghubWorkshopStack(app, 'CdkEksDevLoghubWorkshopStack');
