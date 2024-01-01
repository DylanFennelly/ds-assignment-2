import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as events from "aws-cdk-lib/aws-lambda-event-sources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class EDAAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const imagesBucket = new s3.Bucket(this, "images", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });

    // Queues
    const badImagesQueue = new sqs.Queue(this, "bad-img-queue", {
      retentionPeriod: cdk.Duration.minutes(30)
    })

    const imageProcessQueue = new sqs.Queue(this, "img-created-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(10),
      deadLetterQueue:{
        queue: badImagesQueue,
        maxReceiveCount: 2
      }
    });


    //DynamoDB Table
    const imagesTable = new dynamodb.Table(this, "imagesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "ImageName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,                                 
      tableName: "Images",                                                     
    })



    //SNS topic

    const newImageTopic = new sns.Topic(this, "NewImageTopic", {
      displayName: "New Image topic",
    }); 

    newImageTopic.addSubscription(
      new subs.SqsSubscription(imageProcessQueue)
    );

    const deleteImageTopic = new sns.Topic(this, "DeleteImageTopic", {
      displayName: "Delete Image topic"
    })

    // Lambda functions

    const processImageFn = new lambdanode.NodejsFunction(
      this,
      "ProcessImageFn",
      {
        // architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/processImage.ts`,
        timeout: cdk.Duration.seconds(15),
        memorySize: 128,
        environment: {
          TABLE_NAME: imagesTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const deleteImageFn = new lambdanode.NodejsFunction(
      this,
      "DeleteImageFn",
      {
        // architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/deleteImage.ts`,
        timeout: cdk.Duration.seconds(15),
        memorySize: 128,
        environment: {
          TABLE_NAME: imagesTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const mailerFn = new lambdanode.NodejsFunction(this, "mailer-function", {
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(3),
      entry: `${__dirname}/../lambdas/mailer.ts`,
    });

    const rejectionMailerFn = new lambdanode.NodejsFunction(this, "rejection-mailer-function", {
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(3),
      entry: `${__dirname}/../lambdas/rejectionMailer.ts`,
    });

    // Event triggers

    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SnsDestination(newImageTopic)
    );

    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3n.SnsDestination(deleteImageTopic)
    )

    const newImageEventSource = new events.SqsEventSource(imageProcessQueue, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(10),
    });

    const failedImageEventSource = new events.SqsEventSource(badImagesQueue, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(10),
    })

    processImageFn.addEventSource(newImageEventSource);
    rejectionMailerFn.addEventSource(failedImageEventSource);

    // Subscribe function directly to topic
    newImageTopic.addSubscription(new subs.LambdaSubscription(mailerFn))    //https://rahullokurte.com/how-to-use-aws-sns-with-lambda-subscriptions-in-publisher-subscriber-messaging-systems-using-cdk
    deleteImageTopic.addSubscription(new subs.LambdaSubscription(deleteImageFn))

    // Permissions

    imagesBucket.grantRead(processImageFn);

    mailerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"],
      })
    );
    
    rejectionMailerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"],
      })
    );
    
    imagesTable.grantReadWriteData(processImageFn)
    imagesTable.grantReadWriteData(deleteImageFn)

    // Output

    new cdk.CfnOutput(this, "bucketName", {
      value: imagesBucket.bucketName,
    });
  }
}
