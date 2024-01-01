import { SNSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: SNSHandler = async (event: any) => {
  console.log("Event ", event);
  for (const record of event.Records) {     //https://docs.aws.amazon.com/lambda/latest/dg/with-sns-example.html
    console.log("Record ", record)
    const snsMessage = JSON.parse(record.Sns.Message);

    if (snsMessage) {
      console.log("message body ", JSON.stringify(snsMessage));
      var imageName = snsMessage.name
      const imageDesc =  snsMessage.description

      if (!imageName || !imageDesc){
        console.log(`Message does not contain either "name" or "description"`);
        throw new Error(`Message does not contain either "name" or "description"`);
      }

      if(imageName.includes('"')){
        imageName = imageName.substring(1,-1)
      }

      console.log("update dynamoDB entry for item ",  imageName)

      const commandOutput = await ddbDocClient.send(
        new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key:{
                "ImageName": imageName
            },
            UpdateExpression: 'SET Description = :d',
            ExpressionAttributeValues:{
                ':d': imageDesc
            }
        })
      )

      console.log("DynamoDB response: ", commandOutput)

    }
  }
}

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}