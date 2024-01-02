import { DynamoDBStreamHandler, SNSHandler } from "aws-lambda";
// import AWS from 'aws-sdk';
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";

if (!SES_EMAIL_TO || !SES_EMAIL_FROM || !SES_REGION) {
  throw new Error(
    "Please add the SES_EMAIL_TO, SES_EMAIL_FROM and SES_REGION environment variables in an env.js file located in the root directory"
  );
}

type ContactDetails = {
  name: string;
  email: string;
  message: string;
  subject: string;
};

const client = new SESClient({ region: "eu-west-1" });

export const handler: DynamoDBStreamHandler = async (event: any) => {
  console.log("Event ", event);
  for (const record of event.Records) {     //https://docs.aws.amazon.com/lambda/latest/dg/with-sns-example.html
    console.log("Record ", record)
    console.log("eventName ", record.eventName)

    if (record.eventName === "INSERT"){
        //console.log("dynamodb ", record.dynamodb)
        //console.log("NewImage ", record.dynamodb.NewImage)
        const imageName = record.dynamodb.NewImage.ImageName.S
        console.log("ImageName ", imageName)
        
        if (imageName) {
            try {
                const { name, email, message, subject }: ContactDetails = {
                    name: "The Photo Album",
                    email: SES_EMAIL_FROM,
                    message: `Your image '${imageName}' has been successfully processed! Its URI is s3://${process.env.BUCKET_NAME}/${imageName}`,
                    subject: "New Image Upload"
                };
                const params = sendEmailParams({ name, email, message, subject });
                await client.send(new SendEmailCommand(params));
            } catch (error: unknown) {
                console.log("ERROR is: ", error);
            }
        }else{
            console.log("ERROR: dynamoDB event does not contain imageName")
        }
    }else if(record.eventName === "MODIFY"){
        const imageName = record.dynamodb.NewImage.ImageName.S
        console.log("ImageName ", imageName)
        
        if (imageName) {
            const imageDesc = record.dynamodb.NewImage.Description.S
            try {
                const { name, email, message, subject }: ContactDetails = {
                    name: "The Photo Album",
                    email: SES_EMAIL_FROM,
                    message: `Your image '${imageName}' has been successfully updated!<br><br>
                    The new image description is:<br>
                    "${imageDesc}"\n<br><br>
                    Its URI is s3://${process.env.BUCKET_NAME}/${imageName}`,
                    subject: "Image Updated"
                };
                const params = sendEmailParams({ name, email, message, subject });
                await client.send(new SendEmailCommand(params));
            } catch (error: unknown) {
                console.log("ERROR is: ", error);
            }
        }else{
            console.log("ERROR: dynamoDB event does not contain imageName")
        }

    }else if(record.eventName === "REMOVE"){
        //console.log("OldImage ", record.dynamodb.OldImage)
        //console.log("ImageName ", record.dynamodb.OldImage.ImageName.S)

        const imageName = record.dynamodb.OldImage.ImageName.S
        console.log("ImageName ", imageName)
        
        if (imageName) {
            try {
                const { name, email, message, subject }: ContactDetails = {
                    name: "The Photo Album",
                    email: SES_EMAIL_FROM,
                    message: `Your image '${imageName}' has been successfully deleted.`,
                    subject: "Image Deleted"
                };
                const params = sendEmailParams({ name, email, message, subject });
                await client.send(new SendEmailCommand(params));
            } catch (error: unknown) {
                console.log("ERROR is: ", error);
            }
        }else{
            console.log("ERROR: dynamoDB event does not contain imageName")
        }
    }else{

    }
  }
};

function sendEmailParams({ name, email, message, subject }: ContactDetails) {
  const parameters: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [SES_EMAIL_TO],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: getHtmlContent({ name, email, message, subject }),
        },
        // Text: {
        //   Charset: "UTF-8",
        //   Data: getTextContent({ name, email, message }),
        // },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: SES_EMAIL_FROM,
  };
  return parameters;
}

function getHtmlContent({ name, email, message }: ContactDetails) {
  return `
    <html>
      <body>
        <h2>Sent from: </h2>
        <ul>
          <li style="font-size:18px">👤 <b>${name}</b></li>
          <li style="font-size:18px">✉️ <b>${email}</b></li>
        </ul>
        <p style="font-size:18px">${message}</p>
      </body>
    </html> 
  `;
}

function getTextContent({ name, email, message }: ContactDetails) {
  return `
    Received an Email. 📬
    Sent from:
        👤 ${name}
        ✉️ ${email}
    ${message}
  `;
}