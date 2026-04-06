import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../lib/firebase";
import { firestoreService } from "./firestoreService";
import { authService } from "./authService";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

// You can find your VAPID key in the Firebase Console: Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = "BPF6G-CLioKn5mjfgzNp__-2txWQzA1LOLzNFhPwFxBEOucUPXqZb2eWcDlYV33t_6vz83ZVD-Q5GhMc2ip9-q4";

export const notificationService = {
  requestPermissionAndToken: async () => {
    try {
      if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return null;
      }

      console.log("Requesting notification permission...");
      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        console.log("Notification permission granted.");
        
        try {
          // Get FCM Token
          const currentToken = await getToken(messaging, { 
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || VAPID_KEY 
          });
          
          if (currentToken) {
            console.log("FCM Token earned:", currentToken);
            
            // Save token to Firestore for the current user
            const user = authService.getCurrentUser();
            if (user?.id) {
              await setDoc(
                doc(db, "users", user.id), 
                { fcmToken: currentToken }, 
                { merge: true }
              );
              console.log("FCM Token saved to Firestore for user:", user.id);
            }
            return currentToken;
          } else {
            console.log("No registration token available. Request permission to generate one.");
            return null;
          }
        } catch (err) {
          console.error("An error occurred while retrieving token. ", err);
          return null;
        }
      } else {
        console.log("Unable to get permission to notify.");
        return null;
      }
    } catch (error) {
      console.error("Error asking for notification permission", error);
      return null;
    }
  },

  listenForMessages: () => {
    try {
      onMessage(messaging, (payload) => {
        console.log("Message received in foreground: ", payload);
        
        // Show local toast/notification inside the app
        if (payload.notification) {
          notificationService.showLocalNotification(
            payload.notification.title || "New Notification",
            payload.notification.body || ""
          );
        }
      });
    } catch (error) {
      console.error("Error setting up message listener", error);
    }
  },

  showLocalNotification: (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/vite.svg", // Or path to your logo
      });
    }
  }
};
