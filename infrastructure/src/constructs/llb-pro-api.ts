import {AssetStaging, Duration, Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as aws_apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import path from "node:path";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";

export interface ApiProps {
    CHALLONGE_USERNAME: string;
    CHALLONGE_API_KEY: string;
    GG_API_KEY: string;
    certificateArn: string;
    domainName: string;
}

export class LLBProApi extends Construct {

    constructor(parent: Stack, name: string, props: ApiProps) {
        super(parent, name);

        const seedingLambda = new lambda.Function(this, 'LLBPro-SeedingLambda', {
            functionName: 'LLBPro-SeedingLambda',
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', '..', '/backend-py', 'src')),
            layers: [
                new lambda.LayerVersion(this, 'LLBProApiDepsLayer', {
                    code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', '..', '/backend-py'), {
                        bundling: {
                            image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                            command: [
                                'bash', '-c',
                                `mkdir python && pip install -r requirements.txt -t python && zip -r -q ${AssetStaging.BUNDLING_OUTPUT_DIR}/lambdalayer.zip python && rm -rf python`
                            ]
                        }
                    }),
                    compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
                })
            ],
            timeout: Duration.seconds(20),
            handler: 'app.handler',
            environment: {
                CHALLONGE_USERNAME: props.CHALLONGE_USERNAME || "",
                CHALLONGE_API_KEY: props.CHALLONGE_API_KEY || "",
                GG_API_KEY: props.GG_API_KEY || "",
            }
        });

        const certificate = acm.Certificate.fromCertificateArn(this, 'ApiCertificate', props.certificateArn);
        const zone = route53.HostedZone.fromLookup(this, 'Zone', {domainName: props.domainName});
        const apiDomain = 'api.' + props.domainName;

        const domain = new apigatewayv2.DomainName(this, 'LLBPro-ApiDomain', {
            domainName: apiDomain,
            certificate: certificate,
        });

        new route53.ARecord(this, 'LLBProApiAliasRecord', {
            recordName: apiDomain,
            target: route53.RecordTarget.fromAlias(new targets.ApiGatewayv2DomainProperties(domain.regionalDomainName, domain.regionalHostedZoneId)),
            zone,
        });

        new apigatewayv2.HttpApi(this, 'LLBPro-HttpApi', {
            apiName: 'LLBPro-API',
            defaultIntegration: new aws_apigatewayv2_integrations.HttpLambdaIntegration("LLBPro-HttpLambdaIntegration", seedingLambda, {
                timeout: Duration.seconds(20),
            }),
            corsPreflight: {
                allowOrigins: ['https://' + props.domainName],
                allowMethods: [
                    apigatewayv2.CorsHttpMethod.GET,
                    apigatewayv2.CorsHttpMethod.OPTIONS
                ],
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization'],
            },
            defaultDomainMapping: {
                domainName: domain
            }
        });
    }
}