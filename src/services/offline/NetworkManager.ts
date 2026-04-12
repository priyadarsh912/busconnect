import { Network } from '@capacitor/network';

type NetworkListener = (isOnline: boolean) => void;

export class NetworkManager {
  private listeners: NetworkListener[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.init();
  }

  private async init() {
    const status = await Network.getStatus();
    this.isOnline = status.connected;

    Network.addListener('networkStatusChange', (status) => {
      const wasDisconnected = !this.isOnline;
      this.isOnline = status.connected;
      
      console.log(`NetworkManager: Status changed to ${this.isOnline ? 'Online' : 'Offline'}`);
      
      if (this.isOnline && wasDisconnected) {
        this.notifyListeners(true);
      } else if (!this.isOnline) {
        this.notifyListeners(false);
      }
    });
  }

  public onStatusChange(callback: NetworkListener) {
    this.listeners.push(callback);
    // Immediately call with current status
    callback(this.isOnline);
  }

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(cb => cb(isOnline));
  }

  public getStatus(): boolean {
    return this.isOnline;
  }
}

export const networkManager = new NetworkManager();
