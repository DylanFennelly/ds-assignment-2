## EDA Assignment - Distributed Systems.

__Name:__ Dylan Fennelly

__YouTube Demo link__ - https://www.youtube.com/watch?v=mdUIjpuUTNw

### Phase 1.

+ Process Image - Fully implemented
  + Only accepts '.jpeg' or '.png' files
  + Rejected messages sent to Dead Letter Queue
  + Writes uploaded image name to DynamoDB table as object primary key
+ Confirmation Mailer - Fully implemented
  + Function is directly subscribed to SNS Topic 1
+ Rejection Mailer - Fully implemented
  + Accepts messages from Dead Letter Queue
  + Sends Email notifying of processing error

### Phase 2.

+ Confirmation Mailer - Fully implemented
+ Rejection Mailer - Fully implemented
+ Process Image - Fully implemented
+ Delete Image - Fully implemented
  + Deletes DynamoDB entry for corresponding deleted S3 object
  + Filter on Topic 2 - only allows S3 'ObjectRemoved' events
+ Update Image - Fully implemented
  + Updates DynamoDB entry for ImageName with Description defined in message.json
  + Filter on Topic 2 - only allows custom attribute eventType of type 'UpdateImage'

### Phase 3.

+ Confirmation Mailer - Fully implemented
  + No longer being used - Add/Delete/Update mailers combined into one
+ Rejection Mailer - Fully implemented
+ Process Image - Fully implemented
  + Image Process Queue now directly subscribed to singular Topic - only allows S3 'ObjectCreated' events
+ Delete Image - Fully implemented
  + Subscribed to singular Topic - only allows S3 'ObjectRemoved' events
+ Update Image - Fully implemented
  + Subscribed to singular Topic - only allows custom attribute eventType of type 'UpdateImage'
+ Add Delete Mailer - Fully implemented
  + Combines functions of Confirmation Mailer with Delete mailer and Update mailer
  + Listens to DynamoDB Stream for events
  + Sends appropriate email for INSERT/MODIFY/REMOVE events
