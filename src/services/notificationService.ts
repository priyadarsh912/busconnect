import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../lib/firebase";
import { authService } from "./authService";
import { busService } from "./busService";
import { supabase } from "../lib/supabase";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { networkManager } from "./offline/NetworkManager";
import { syncQueueService, SyncPriority } from "./offline/SyncQueueService";

// You can find your VAPID key in the Firebase Console: Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = "BPF6G-CLioKn5mjfgzNp__-2txWQzA1LOLzNFhPwFxBEOucUPXqZb2eWcDlYV33t_6vz83ZVD-Q5GhMc2ip9-q4";

export const notificationService = {
  /**
   * Request permission and get FCM token
   */
  requestPermissionAndToken: async () => {
    try {
      // 1. Request Native Permissions if on Android/iOS
      if (Capacitor.isNativePlatform()) {
        const perm = await LocalNotifications.requestPermissions();
        console.log("Native notification permission:", perm.display);
      }

      // 2. Register Service Worker for Web Background Messaging
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Service Worker registered with scope:', registration.scope);
        } catch (err) {
          console.error('Service Worker registration failed:', err);
        }
      }

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
            
            // Save token to Supabase for the current user
            const user = authService.getCurrentUser();
            if (user?.id) {
              const { error } = await supabase
                .from('profiles')
                .update({ fcm_token: currentToken })
                .eq('id', user.id);
                
              if (error) console.error("Error saving FCM token to Supabase:", error);
              else console.log("FCM Token saved to Supabase for user:", user.id);
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

  /**
   * Save user location to Supabase for proximity alerts
   */
  updateUserLocation: async (lat: number, lng: number) => {
    const user = authService.getCurrentUser();
    if (user?.id) {
      const payload = { 
        id: user.id,
        latitude: lat, 
        longitude: lng, 
        updated_at: new Date().toISOString() 
      };

      if (networkManager.getStatus()) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              latitude: lat, 
              longitude: lng, 
              updated_at: payload.updated_at 
            })
            .eq('id', user.id);
            
          if (error) throw error;
          console.log("User location updated in Supabase");
        } catch (error) {
          console.error("Error updating user location in Supabase:", error);
          // Optional: fallback to queueing if update fails even while online
        }
      } else {
        console.log("Offline: Queueing user location update...");
        await syncQueueService.enqueue('UPDATE_PROFILE', payload, SyncPriority.MEDIUM);
      }
    }
  },

  /**
   * Update notification radius (in meters)
   */
  updateNotifyRadius: async (radius: number) => {
    const user = authService.getCurrentUser();
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ notify_radius: radius })
          .eq('id', user.id);
          
        if (error) throw error;
        console.log("User notification radius updated to:", radius);
      } catch (error) {
        console.error("Error updating notify radius in Supabase:", error);
      }
    }
  },

  /**
   * Start listening for FCM messages in the foreground
   */
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

  /**
   * Trigger a proper SYSTEM notification (Web + Android)
   */
  showLocalNotification: async (title: string, body: string) => {
    console.log("Triggering system notification:", { title, body });
    
    // 1. Native System Notification (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Math.floor(Math.random() * 10000),
              schedule: { at: new Date(Date.now() + 1000) }, // Show in 1 sec
              sound: "beep.wav",
              attachments: [],
              actionTypeId: "",
              extra: null
            }
          ]
        });
        console.log("SUCCESS: Native notification scheduled");
      } catch (err) {
        console.error("ERROR: Native notification failed:", err);
      }
      return;
    }

    // 3. Web System Notification (Browser)
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          reg.showNotification(title, { body, icon: "/vite.svg" });
        } else {
          new Notification(title, { body, icon: "/vite.svg" });
        }
      } catch (err) {
        console.error("ERROR: Browser notification failed:", err);
      }
    } else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    } else {
      console.warn("NOTIFY_FAILED: Notifications are not supported or are denied.");
    }
  }
};
