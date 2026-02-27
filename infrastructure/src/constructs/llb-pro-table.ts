import {RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class LLBProTable extends Construct {
    public readonly table: dynamodb.Table;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.table = new dynamodb.Table(this, 'LLBPro-Table', {
            tableName: 'LLBPro-Table',
            partitionKey: {name: 'PK', type: dynamodb.AttributeType.STRING},
            sortKey: {name: 'SK', type: dynamodb.AttributeType.STRING},
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: 20,
            writeCapacity: 20,
            encryption: dynamodb.TableEncryption.DEFAULT,
            pointInTimeRecovery: false,
            removalPolicy: RemovalPolicy.RETAIN,
        });
    }
}

