import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StaticSite } from './constructs/static-site';
import {LLBProApi} from "./constructs/llb-pro-api";

const app = new App();

const domainName = process.env.DOMAIN_NAME || "";

export class LLBProStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    new StaticSite(this, 'llbpro-static-site', {
      domainName: domainName,
      certificateArn: process.env.SITE_CERTIFICATE_ARN || "",
    });

    new LLBProApi(this, 'llbpro-api', {
      CHALLONGE_USERNAME: process.env.CHALLONGE_USERNAME || "",
      CHALLONGE_API_KEY: process.env.CHALLONGE_API_KEY || "",
      GG_API_KEY: process.env.GG_API_KEY || "",
      certificateArn: process.env.API_CERTIFICATE_ARN || "",
      domainName: domainName,
    });
  }
}

new LLBProStack(app, 'llbpro-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ,
  },
});

app.synth();