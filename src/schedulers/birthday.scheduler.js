const cron = require("node-cron");
const PartyMemberModel = require("../modules/directory/directoryPartyMembers.model"); // Adjust path as per your structure
const OtherContactsModel = require("../modules/directory/directoryOtherContacts.model"); // Adjust path as per your structure
const Notification = require("../modules/notification/notification.model");
const NotificationService = require("../modules/notification/notification.service");

function runBirthdayScheduler() {

    cron.schedule("0 0 * * *", async () => {
        console.log("[PartyMemberModel] Checking birthdays...")
        await checkBirthdaysAndNotify(PartyMemberModel, "partyDirectoryBirthdayReminders");
        console.log("[OtherContactsModel] Checking birthdays...");
        await checkBirthdaysAndNotify(OtherContactsModel, "personalBirthdayReminders");
    })
    console.log("Birthday reminder scheduler initialized")
}

async function checkBirthdaysAndNotify(Model, collectionName) {
    try {  
      const today = new Date()
      const currentMonth = today.getMonth() + 1 // JavaScript months are 0-indexed
      const currentDay = today.getDate()

    //   console.log("Today",today)
  
      // Find all party members with priority=true
      const priorityContacts = await Model.find({ isPriority: true })
        
      for (const contact of priorityContacts) {
        if (!contact.dob) continue
  
        const dob = new Date(contact.dob)
        const birthMonth = dob.getMonth() + 1
        const birthDay = dob.getDate()
  
        // Check if today is the contact's birthday (same month and day)
        if (birthMonth === currentMonth && birthDay === currentDay) {
          await sendBirthdayNotification(contact,collectionName)
        }
      }
  
      console.log(`Birthday check completed for ${collectionName}`)
    } catch (error) {
      console.error("Error in birthday check scheduler:", error)
    }
} 

async function sendBirthdayNotification(contact,collectionName) {
    try {  
      // Create notification object
      const notificationObj = {
        collectionName: collectionName,
        documentId: contact._id.toString(),
        creatorType: "client",
        creator: contact.createdBy, 
        receiverType: "client",
        receiver: contact.createdBy, // Send to the user who created the contact
        status: "birthdayReminder",
        isViewed: false,
        title: `Today is Birthday of ${contact.firstName} ${contact.lastName}`,
        content: "Birthday reminder",
      }
  
      // Create the notification
    //   console.log("Notification Res",notificationObj)
    const notificationResponse = await NotificationService.sendNotification(notificationObj)
      
    if (notificationResponse.status) {
        console.log(`Birthday notification sent for ${contact.firstName} ${contact.lastName}`)
    } else {
        console.error("Error sending birthday notification:", notificationResponse.error)
    }
    } catch (error) {
      console.error("Error sending birthday notification:", error)
    }
}
  
module.exports = runBirthdayScheduler;
  